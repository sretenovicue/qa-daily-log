/**
 * Smoke test — brza provjera da app radi pre punog stress testa.
 * Pokretanje: k6 run tests/stress/smoke.stress.js
 */

import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus:        1,
  iterations: 1,
  thresholds: {
    http_req_failed:   ['rate==0'],
    http_req_duration: ['p(100)<5000'],
  },
};

export default function () {
  const tests = [
    { name: 'health check',  url: `${BASE}/api/health`,       expectedStatus: 200 },
    { name: 'login endpoint', url: `${BASE}/api/auth/login`,   expectedStatus: 400 }, // 400 jer nema body
    { name: 'entries (unauth)',url: `${BASE}/api/entries`,     expectedStatus: 401 }, // 401 bez tokena
  ];

  tests.forEach(({ name, url, expectedStatus }) => {
    const r = http.get(url);
    check(r, { [`${name}: status ${expectedStatus}`]: (res) => res.status === expectedStatus });
  });
}
