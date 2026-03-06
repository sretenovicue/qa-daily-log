/**
 * QA Daily Log — k6 Stress Test
 *
 * Pokretanje:
 *   k6 run tests/stress/api.stress.js
 *   k6 run --env BASE_URL=http://localhost:3001 tests/stress/api.stress.js
 *
 * Instalacija k6: https://k6.io/docs/get-started/installation/
 *   brew install k6   (macOS)
 *   choco install k6  (Windows)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate    = new Rate('errors');
const loginTrend   = new Trend('login_duration', true);
const entriesTrend = new Trend('entries_duration', true);

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

// Test stages — ramp up, hold, ramp down
export const options = {
  stages: [
    { duration: '20s', target: 10  },  // ramp up to 10 users
    { duration: '1m',  target: 25  },  // scale to 25 users
    { duration: '30s', target: 50  },  // spike to 50 users
    { duration: '30s', target: 10  },  // scale back
    { duration: '10s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration:  ['p(95)<2000'],  // 95% zahteva < 2s
    http_req_failed:    ['rate<0.02'],   // manje od 2% grešaka
    errors:             ['rate<0.05'],   // custom error rate < 5%
    login_duration:     ['p(99)<3000'],  // login p99 < 3s
  },
};

// Setup — loguj kao guest, vrati token
export function setup() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: 'guest', password: 'guest' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const ok = check(res, {
    'setup: login 200':     (r) => r.status === 200,
    'setup: token postoji': (r) => !!r.json('token'),
  });

  if (!ok) {
    console.error('Setup login nije uspio:', res.status, res.body.slice(0, 200));
  }

  return { token: res.json('token') };
}

// Glavna virtualna korisnikova sesija
export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type':  'application/json',
    'x-playwright-test': '1',  // bypass auth rate limiter
  };

  group('Health check', () => {
    const r = http.get(`${BASE}/api/health`);
    errorRate.add(!check(r, { 'health 200': (r) => r.status === 200 }));
  });

  group('Entries — GET', () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = http.get(`${BASE}/api/entries?date=${today}`, { headers });
    entriesTrend.add(r.timings.duration);
    errorRate.add(!check(r, {
      'entries 200':    (r) => r.status === 200,
      'entries array':  (r) => Array.isArray(r.json()),
    }));
  });

  group('Stats', () => {
    const r = http.get(`${BASE}/api/stats`, { headers });
    errorRate.add(!check(r, { 'stats 200': (r) => r.status === 200 }));
  });

  sleep(1);  // pauza između iteracija — simulira realnog korisnika
}

// Auth endpoint — poseban test (login spam)
export function authStress() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: 'guest', password: 'guest' }),
    {
      headers: { 'Content-Type': 'application/json', 'x-playwright-test': '1' },
      tags: { name: 'login' },
    }
  );
  loginTrend.add(res.timings.duration);
  errorRate.add(!check(res, { 'login 200': (r) => r.status === 200 }));
  sleep(0.5);
}
