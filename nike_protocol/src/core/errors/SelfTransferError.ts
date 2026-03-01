import { DomainError } from './DomainError.js';

export class SelfTransferError extends DomainError {
  readonly code = 'SELF_TRANSFER_NOT_ALLOWED';
  readonly statusCode = 400;
  readonly isRetryable = false;

  constructor() {
    super('Cannot send to yourself');
  }
}
