// Coin Service - Application Layer
// Orchestrates domain operations using repository and crypto abstractions

import { randomUUID } from 'crypto';
import { 
  CoinAccount, 
  CoinTransaction, 
  TransactionWithDirection,
  TransactionType 
} from '../core/types.js';
import { 
  IAccountRepository, 
  ITransactionRepository, 
  ISigner 
} from '../core/interfaces.js';
import {
  InsufficientFundsError,
  InvalidAmountError,
  SelfTransferError,
  InvalidSignatureError
} from '../core/errors/index.js';

export class CoinService {
  constructor(
    private accountRepo: IAccountRepository,
    private txRepo: ITransactionRepository,
    private signer: ISigner
  ) {}

  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new InvalidAmountError('Amount must be positive');
    }
    if (amount > Number.MAX_SAFE_INTEGER) {
      throw new InvalidAmountError('Amount exceeds safe integer limit');
    }
  }

  private createSignature(type: TransactionType, data: {
    from?: string;
    to?: string;
    amount: number;
    time: number;
  }): string {
    return this.signer.sign({ type, ...data });
  }

  mint(toDiscordId: string, amount: number, memo?: string, username?: string): CoinTransaction {
    this.validateAmount(amount);
    
    const account = this.accountRepo.getOrCreate(toDiscordId, username);
    const now = Date.now();
    const signature = this.createSignature('mint', {
      to: account.did,
      amount,
      time: now
    });

    const tx: CoinTransaction = {
      id: randomUUID(),
      from_did: 'MINT',
      to_did: account.did,
      amount,
      timestamp: now,
      signature,
      memo: memo || 'Minted by system'
    };

    // Execute transaction atomically
    account.balance += amount;
    account.total_received += amount;
    account.updated_at = now;
    
    this.txRepo.save(tx);
    this.accountRepo.update(account);

    return tx;
  }

  send(
    fromDiscordId: string, 
    toDiscordId: string, 
    amount: number, 
    memo?: string,
    fromUsername?: string,
    toUsername?: string
  ): CoinTransaction {
    this.validateAmount(amount);
    
    if (fromDiscordId === toDiscordId) {
      throw new SelfTransferError();
    }

    const fromAccount = this.accountRepo.getOrCreate(fromDiscordId, fromUsername);
    const toAccount = this.accountRepo.getOrCreate(toDiscordId, toUsername);

    if (fromAccount.balance < amount) {
      throw new InsufficientFundsError(fromAccount.balance, amount);
    }

    const now = Date.now();
    const signature = this.createSignature('transfer', {
      from: fromAccount.did,
      to: toAccount.did,
      amount,
      time: now
    });

    const tx: CoinTransaction = {
      id: randomUUID(),
      from_did: fromAccount.did,
      to_did: toAccount.did,
      amount,
      timestamp: now,
      signature,
      memo
    };

    // Update balances
    fromAccount.balance -= amount;
    fromAccount.total_sent += amount;
    fromAccount.updated_at = now;

    toAccount.balance += amount;
    toAccount.total_received += amount;
    toAccount.updated_at = now;

    // Save atomically
    this.txRepo.save(tx);
    this.accountRepo.update(fromAccount);
    this.accountRepo.update(toAccount);

    return tx;
  }

  burn(fromDiscordId: string, amount: number, memo?: string, username?: string): CoinTransaction {
    this.validateAmount(amount);

    const account = this.accountRepo.getOrCreate(fromDiscordId, username);
    
    if (account.balance < amount) {
      throw new InsufficientFundsError(account.balance, amount);
    }

    const now = Date.now();
    const signature = this.createSignature('burn', {
      from: account.did,
      amount,
      time: now
    });

    const tx: CoinTransaction = {
      id: randomUUID(),
      from_did: account.did,
      to_did: 'BURN',
      amount,
      timestamp: now,
      signature,
      memo: memo || 'Burned by owner'
    };

    account.balance -= amount;
    account.total_sent += amount;
    account.updated_at = now;

    this.txRepo.save(tx);
    this.accountRepo.update(account);

    return tx;
  }

  getBalance(discordId: string): number {
    const account = this.accountRepo.getOrCreate(discordId);
    return account.balance;
  }

  getHistory(discordId: string, limit = 10): TransactionWithDirection[] {
    return this.txRepo.getHistory(discordId, limit);
  }

  getStats(discordId: string): CoinAccount {
    return this.accountRepo.getOrCreate(discordId);
  }

  listAccounts(limit = 20): ReturnType<IAccountRepository['listAll']> {
    return this.accountRepo.listAll(limit);
  }

  verifyTransaction(tx: CoinTransaction): boolean {
    let data: object;
    if (tx.from_did === 'MINT') {
      data = { type: 'mint', to: tx.to_did, amount: tx.amount, time: tx.timestamp };
    } else if (tx.to_did === 'BURN') {
      data = { type: 'burn', from: tx.from_did, amount: tx.amount, time: tx.timestamp };
    } else {
      data = { type: 'transfer', from: tx.from_did, to: tx.to_did, amount: tx.amount, time: tx.timestamp };
    }
    
    const isValid = this.signer.verify(data, tx.signature);
    if (!isValid) {
      throw new InvalidSignatureError();
    }
    return true;
  }
}
