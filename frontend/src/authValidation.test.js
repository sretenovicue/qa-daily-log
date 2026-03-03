import { describe, it, expect } from 'vitest';

// ── Inline validation logic (mirrors AuthPage.jsx) ────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(email, password) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email je obavezan';
  else if (!EMAIL_RE.test(email)) errors.email = 'Email format nije validan';
  if (!password) errors.password = 'Lozinka je obavezna';
  return errors;
}

function validateRegister(email, username, password, confirm) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email je obavezan';
  else if (!EMAIL_RE.test(email)) errors.email = 'Email format nije validan';
  if (!username.trim()) errors.username = 'Korisničko ime je obavezno';
  if (!password) errors.password = 'Lozinka je obavezna';
  else if (password.length < 8) errors.password = 'Lozinka mora imati najmanje 8 znakova';
  if (password !== confirm) errors.confirm = 'Lozinke se ne poklapaju';
  return errors;
}

// ─────────────────────────────────────────────────────────────────────

describe('validateLogin', () => {
  it('nema grešaka za ispravne podatke', () => {
    expect(validateLogin('user@test.com', 'password1')).toEqual({});
  });

  it('greška za prazan email', () => {
    const e = validateLogin('', 'password1');
    expect(e.email).toBe('Email je obavezan');
  });

  it('greška za email bez @', () => {
    const e = validateLogin('notanemail', 'password1');
    expect(e.email).toBe('Email format nije validan');
  });

  it('greška za praznu lozinku', () => {
    const e = validateLogin('user@test.com', '');
    expect(e.password).toBe('Lozinka je obavezna');
  });

  it('greška za email samo sa razmacima', () => {
    const e = validateLogin('   ', 'password1');
    expect(e.email).toBe('Email je obavezan');
  });
});

describe('validateRegister', () => {
  const good = ['user@test.com', 'TestUser', 'password1', 'password1'];

  it('nema grešaka za ispravne podatke', () => {
    expect(validateRegister(...good)).toEqual({});
  });

  it('greška za loš email format', () => {
    const e = validateRegister('bad-email', 'User', 'password1', 'password1');
    expect(e.email).toBe('Email format nije validan');
  });

  it('greška za prazno korisničko ime', () => {
    const e = validateRegister('a@b.com', '', 'password1', 'password1');
    expect(e.username).toBe('Korisničko ime je obavezno');
  });

  it('greška za korisničko ime sa samo razmacima', () => {
    const e = validateRegister('a@b.com', '   ', 'password1', 'password1');
    expect(e.username).toBe('Korisničko ime je obavezno');
  });

  it('greška za lozinku kraću od 8 znakova', () => {
    const e = validateRegister('a@b.com', 'User', 'short', 'short');
    expect(e.password).toBe('Lozinka mora imati najmanje 8 znakova');
  });

  it('greška za lozinke koje se ne poklapaju', () => {
    const e = validateRegister('a@b.com', 'User', 'password1', 'password2');
    expect(e.confirm).toBe('Lozinke se ne poklapaju');
  });

  it('greška za praznu lozinku', () => {
    const e = validateRegister('a@b.com', 'User', '', '');
    expect(e.password).toBe('Lozinka je obavezna');
  });

  it('nema greške za confirm kada lozinka nije unesena (prazna != prazna nema mismatch ako oba prazna)', () => {
    // Both empty → password error shown first, confirm '' === '' no mismatch
    const e = validateRegister('a@b.com', 'User', '', '');
    expect(e.confirm).toBeUndefined();
  });
});
