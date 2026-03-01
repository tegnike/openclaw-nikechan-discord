import { randomUUID } from 'crypto';

export class Transaction {
  readonly id: string;
  readonly did: string;
  readonly amount: number;
  readonly type: string;
  readonly description: string;
  readonly createdAt: Date;

  constructor(
    id: string,
    did: string,
    amount: number,
    type: string,
    description: string,
    createdAt: Date
  ) {
    this.id = id;
    this.did = did;
    this.amount = amount;
    this.type = type;
    this.description = description;
    this.createdAt = createdAt;
  }

  static create(params: {
    did: string;
    amount: number;
    type: string;
    description?: string;
  }): Transaction {
    return new Transaction(
      randomUUID(),
      params.did,
      params.amount,
      params.type,
      params.description || '',
      new Date()
    );
  }
}
