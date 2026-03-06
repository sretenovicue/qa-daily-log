require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS — only allow the frontend origin
app.use(cors({
  origin:  process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// Body size limit — prevent oversized payload DoS
app.use(express.json({ limit: '50kb' }));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Rate limiting — 10 auth attempts per 15 min per IP
// Skip in Playwright E2E tests (identified by custom header)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: (req) => req.headers['x-playwright-test'] === '1',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Previše pokušaja prijave. Pokušajte ponovo za 15 minuta.' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
const authMiddleware = require('./middleware/auth');
app.use('/api/auth',    require('./routes/auth'));                              // public
app.use('/api/entries', authMiddleware, require('./routes/entries'));           // protected
app.use('/api/stats',   authMiddleware, require('./routes/stats'));             // protected
app.use('/api/users',   authMiddleware, require('./routes/users'));             // manager only
app.use('/api/hub',     authMiddleware, require('./routes/hub'));               // QA Hub
app.get('/api/health',  (_, res) => res.json({ ok: true }));

// Serve frontend static files if dist folder exists
const path = require('path');
const fs   = require('fs');
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  // 404 handler (dev mode — no build)
  app.use((req, res) => {
    res.status(404).json({ error: `${req.method} ${req.path} nije pronađeno` });
  });
}

// Global error handler — catches any unhandled error from routes
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[ERROR]', err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${process.env.ALLOWED_ORIGIN || 'http://localhost:5173'}`);
});
