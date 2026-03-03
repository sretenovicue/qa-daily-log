const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.userId   = payload.userId;
    req.userRole = payload.role || 'user';
    next();
  } catch {
    res.status(401).json({ error: 'Token nije validan ili je istekao' });
  }
}

function requireManager(req, res, next) {
  if (req.userRole !== 'manager') {
    return res.status(403).json({ error: 'Pristup dozvoljen samo menadžerima' });
  }
  next();
}

module.exports = authMiddleware;
module.exports.requireManager = requireManager;
