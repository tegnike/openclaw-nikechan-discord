// Domain Errors

export class NikeCoinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NikeCoinError';
  }
}

export class InsufficientBalanceError extends NikeCoinError {
  constructor(balance: number, required: number) {
    super(`Insufficient balance: ${balance} < ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class InvalidAmountError extends NikeCoinError {
  constructor(amount: number) {
    super(`Invalid amount: ${amount}. Must be positive and within safe integer range.`);
    this.name = 'InvalidAmountError';
  }
}

export class SelfTransferError extends NikeCoinError {
  constructor() {
    super('Cannot send to yourself');
    this.name = 'SelfTransferError';
  }
}

export class DecryptionError extends NikeCoinError {
  constructor(message: string) {
    super(`Decryption failed: ${message}`);
    this.name = 'DecryptionError';
  }
}
