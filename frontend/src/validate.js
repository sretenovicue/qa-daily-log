export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('. '));
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

export function validateEntry(form) {
  const errors = [];

  if (!form.category) {
    errors.push('Kategorija je obavezna');
  }
  if (!form.action) {
    errors.push('Akcija je obavezna');
  }
  if (form.manualTime && !isValidDuration(form.manualTime.trim())) {
    errors.push('Trajanje mora biti u formatu h:mm (npr. 1:30 ili 0:45)');
  }

  return errors;
}

function isValidDuration(str) {
  if (!str) return true;
  return /^\d+:[0-5]\d$/.test(str);
}
