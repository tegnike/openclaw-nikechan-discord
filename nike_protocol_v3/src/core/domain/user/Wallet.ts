export interface WalletData {
  did: string;
  balance: number;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Wallet {
  readonly did: string;
  balance: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: WalletData) {
    this.did = data.did;
    this.balance = data.balance;
    this.version = data.version || 1;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static create(data: WalletData): Wallet {
    return new Wallet(data);
  }
}
