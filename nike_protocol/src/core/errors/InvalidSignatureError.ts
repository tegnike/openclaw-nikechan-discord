import { DomainError } from './DomainError.js';

export class InvalidSignatureError extends DomainError {
  readonly code = 'INVALID_SIGNATURE';
  readonly statusCode = 400;
  readonly isRetryable = false;

  constructor() {
    super('Transaction signature verification failed');
  }
}
