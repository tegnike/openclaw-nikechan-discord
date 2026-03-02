// ============================================
// ReNikeProtocol - Coin Service
// ============================================

import { DID, OperationResult, Wallet, Transaction } from '../core/types.js';
import { WalletRepository } from '../repositories/wallet.js';
import { ProfileRepository } from '../repositories/profile.js';
import { NikeError } from '../core/errors.js';

export interface ServiceContext {
  walletRepo: WalletRepository;
  profileRepo: ProfileRepository;
}

export interface BalanceResult {
  did: DID;
  balance: number;
}

export interface TransferResult {
  fromBalance: number;
  toBalance: number;
  transactionId: string;
}

export interface MintResult {
  newBalance: number;
  transactionId: string;
}

function createSuccess<T>(data: T): OperationResult<T> {
  return {
    success: true,
    data,
    timestamp: new Date()
  };
}

function createError<T>(error: Error): OperationResult<T> {
  return {
    success: false,
    error: error instanceof NikeError ? error.message : 'Unknown error',
    timestamp: new Date()
  };
}

export class CoinService {
  constructor(private ctx: ServiceContext) {}

  /**
   * Get wallet balance
   */
  async getBalance(did: DID): Promise<OperationResult<BalanceResult>> {
    const startTime = Date.now();

    try {
      const wallet = await this.ctx.walletRepo.findByDID(did);

      if (!wallet) {
        // Return zero balance for non-existent wallet
        return createSuccess({ did, balance: 0 });
      }

      await this.ctx.profileRepo.touch(did);

      return createSuccess({ did, balance: wallet.balance });
    } catch (error) {
      return createError(error as Error);
    }
  }

  /**
   * Transfer coins between users
   */
  async transfer(
    fromDid: DID,
    toDid: DID,
    amount: number,
    description: string
  ): Promise<OperationResult<TransferResult>> {
    const startTime = Date.now();

    try {
      const result = await this.ctx.walletRepo.transfer(fromDid, toDid, amount, description);

      // Update profiles
      await this.ctx.profileRepo.recordSpend(fromDid, amount);
      await this.ctx.profileRepo.touch(toDid);

      return createSuccess({
        fromBalance: result.fromWallet.balance,
        toBalance: result.toWallet.balance,
        transactionId: result.transaction.id
      });
    } catch (error) {
      return createError(error as Error);
    }
  }

  /**
   * Mint coins (admin operation)
   */
  async mint(
    toDid: DID,
    amount: number,
    description: string
  ): Promise<OperationResult<MintResult>> {
    const startTime = Date.now();

    try {
      const result = await this.ctx.walletRepo.mint(toDid, amount, description);

      // Update profile
      await this.ctx.profileRepo.recordMint(toDid, amount);
      await this.ctx.profileRepo.upsert(toDid);

      return createSuccess({
        newBalance: result.wallet.balance,
        transactionId: result.transaction.id
      });
    } catch (error) {
      return createError(error as Error);
    }
  }

  /**
   * Get transaction history
   */
  async getHistory(did: DID, limit: number = 20): Promise<OperationResult<Transaction[]>> {
    const startTime = Date.now();

    try {
      const transactions = await this.ctx.walletRepo.getHistory(did, limit);
      return createSuccess(transactions);
    } catch (error) {
      return createError(error as Error);
    }
  }
}
