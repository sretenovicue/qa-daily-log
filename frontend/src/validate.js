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
    errors.push('validation.categoryRequired');
  }
  if (!form.action) {
    errors.push('validation.actionRequired');
  }
  if (!form.status) {
    errors.push('validation.statusRequired');
  }
  if (!form.description || !form.description.trim()) {
    errors.push('validation.descriptionRequired');
  }
  if (!form.manualTime || !form.manualTime.trim()) {
    errors.push('validation.durationRequired');
  } else if (!isValidDuration(form.manualTime.trim())) {
    errors.push('validation.durationFormat');
  }

  return errors;
}

function isValidDuration(str) {
  if (!str) return true;
  return /^\d+:[0-5]\d$/.test(str);
}
