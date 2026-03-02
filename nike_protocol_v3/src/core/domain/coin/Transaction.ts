export interface TransactionData {
  id?: string;
  type: 'MINT' | 'TRANSFER' | 'GACHA';
  amount: number;
  fromDid?: string;
  toDid?: string;
  description?: string;
  signature: string;
  timestamp?: Date;
}

export class Transaction {
  readonly id: string;
  readonly type: 'MINT' | 'TRANSFER' | 'GACHA';
  readonly amount: number;
  readonly fromDid?: string;
  readonly toDid?: string;
  readonly description?: string;
  readonly signature: string;
  readonly timestamp: Date;

  constructor(data: TransactionData) {
    this.id = data.id || crypto.randomUUID();
    this.type = data.type;
    this.amount = data.amount;
    this.fromDid = data.fromDid;
    this.toDid = data.toDid;
    this.description = data.description;
    this.signature = data.signature;
    this.timestamp = data.timestamp || new Date();
  }

  static create(data: TransactionData): Transaction {
    return new Transaction(data);
  }
}
