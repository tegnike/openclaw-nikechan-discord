export class DomainError extends Error {
  constructor(
    public readonly type: string,
    message: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export type NikeError = 
  | { type: 'INVALID_AMOUNT'; message: string }
  | { type: 'NEGATIVE_AMOUNT'; message: string }
  | { type: 'OVERFLOW'; message: string }
  | { type: 'MAX_EXCEEDED'; message: string }
  | { type: 'INSUFFICIENT_BALANCE'; message: string }
  | { type: 'WALLET_NOT_FOUND'; message: string }
  | { type: 'TRANSACTION_FAILED'; message: string }
  | { type: 'INVALID_DID'; message: string }
  | { type: 'DATABASE_ERROR'; message: string };
