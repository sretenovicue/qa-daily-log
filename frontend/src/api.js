const BASE = '/api';

function getToken() { return localStorage.getItem('token'); }

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.reload();
    return;
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getEntries(params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/entries${qs ? '?' + qs : ''}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createEntry(data) {
  const res = await fetch(`${BASE}/entries`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateEntry(id, data) {
  const res = await fetch(`${BASE}/entries/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteEntry(id) {
  const res = await fetch(`${BASE}/entries/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function getStats(params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/stats${qs ? '?' + qs : ''}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function authRegister(email, username, password) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function authLogin(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function authMe() {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTeamStats(params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/stats/team${qs ? '?' + qs : ''}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getUsers() {
  const res = await fetch(`${BASE}/users`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createUser(data) {
  const res = await fetch(`${BASE}/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function toggleUser(id) {
  const res = await fetch(`${BASE}/users/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function approveUser(id) {
  const res = await fetch(`${BASE}/users/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}
