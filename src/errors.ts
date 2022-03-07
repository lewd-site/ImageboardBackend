export type ValidationErrorKind = 'required' | 'max-length' | 'pattern';

export class ValidationError extends Error {
  public constructor(public readonly field: string, public readonly error: ValidationErrorKind, message?: string) {
    super(message);
  }
}

export class NotAuthenticatedError extends Error {}

export class NotFoundError extends Error {
  public constructor(public readonly field: string, message?: string) {
    super(message);
  }
}

export class ConflictError extends Error {
  public constructor(public readonly field: string, message?: string) {
    super(message);
  }
}
