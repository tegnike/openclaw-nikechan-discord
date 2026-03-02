// ============================================
// ReNikeProtocol - Error Definitions
// ============================================

export class NikeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NikeError';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: new Date().toISOString()
    };
  }
}

export class InsufficientBalanceError extends NikeError {
  constructor(current: number, required: number) {
    super(
      `Insufficient balance: ${current} < ${required}`,
      'INSUFFICIENT_BALANCE',
      { current, required }
    );
  }
}

export class WalletNotFoundError extends NikeError {
  constructor(did: string) {
    super(
      `Wallet not found: ${did}`,
      'WALLET_NOT_FOUND',
      { did }
    );
  }
}

export class InvalidAmountError extends NikeError {
  constructor(amount: number) {
    super(
      `Invalid amount: ${amount}`,
      'INVALID_AMOUNT',
      { amount }
    );
  }
}

export class SelfTransferError extends NikeError {
  constructor() {
    super(
      'Cannot transfer to self',
      'SELF_TRANSFER'
    );
  }
}
