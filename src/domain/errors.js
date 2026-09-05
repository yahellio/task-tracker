export class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.expected = true;
  }
}

export class ValidationError extends AppError {
  constructor(message, fieldErrors = {}) {
    super(message, 422);
    this.fieldErrors = fieldErrors;
  }

  static forField(field, message) {
    return new ValidationError(message, { [field]: message });
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}
