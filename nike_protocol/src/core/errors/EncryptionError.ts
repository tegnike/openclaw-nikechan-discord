import { DomainError } from './DomainError.js';

export class EncryptionError extends DomainError {
  readonly code = 'ENCRYPTION_FAILED';
  readonly statusCode = 500;
  readonly isRetryable = true;
}
