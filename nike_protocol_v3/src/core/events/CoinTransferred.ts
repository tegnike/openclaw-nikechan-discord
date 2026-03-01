import { DomainEvent } from './DomainEvent.js';
import type { UserId } from '../domain/user/UserId.js';
import type { Coin } from '../domain/coin/Coin.js';

export class CoinTransferred extends DomainEvent {
  readonly fromDid: UserId;
  readonly toDid: UserId;
  readonly amount: Coin;
  readonly reason: string;

  constructor(fromDid: UserId, toDid: UserId, amount: Coin, reason: string) {
    super();
    this.fromDid = fromDid;
    this.toDid = toDid;
    this.amount = amount;
    this.reason = reason;
  }
}
