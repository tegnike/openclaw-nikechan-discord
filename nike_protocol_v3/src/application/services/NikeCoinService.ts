import { SQLiteWalletRepository } from '../../infrastructure/repositories/SQLiteWalletRepository.js';
import { SQLiteTransactionRepository } from '../../infrastructure/repositories/SQLiteTransactionRepository.js';
import { Wallet } from '../../core/domain/user/Wallet.js';
import { Transaction } from '../../core/domain/coin/Transaction.js';
import { Result, ok, err } from '../../core/shared/Result.js';
import { NikeError } from '../../core/errors/NikeError.js';
import { createHmac } from 'crypto';

export interface MintResult {
  txId: string;
  newBalance: number;
}

export interface TransferResult {
  txId: string;
  fromBalance: number;
  toBalance: number;
}

export class NikeCoinService {
  private walletRepo: SQLiteWalletRepository;
  private txRepo: SQLiteTransactionRepository;
  private signFn: (data: string) => string;

  private constructor(
    walletRepo: SQLiteWalletRepository,
    txRepo: SQLiteTransactionRepository,
    signFn: (data: string) => string
  ) {
    this.walletRepo = walletRepo;
    this.txRepo = txRepo;
    this.signFn = signFn;
  }

  static async create(): Promise<NikeCoinService> {
    const dbPath = process.env.NIKECOIN_DB_PATH || './data/coin_v3.db';
    const encryptionKey = process.env.NIKE_COIN_ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error('NIKE_COIN_ENCRYPTION_KEY environment variable is required');
    }

    const walletRepo = new SQLiteWalletRepository(dbPath, encryptionKey);
    const txRepo = new SQLiteTransactionRepository(dbPath, encryptionKey);
    
    const signFn = (data: string) => {
      const secret = process.env.NIKECOIN_SECRET || 'default-secret';
      return createHmac('sha256', secret).update(data).digest('hex');
    };

    return new NikeCoinService(walletRepo, txRepo, signFn);
  }

  async mint(did: string, amount: number, reason: string): Promise<Result<MintResult, NikeError>> {
    // Add balance atomically
    const addResult = await this.walletRepo.addBalance(did, amount);
    if (!addResult.success) {
      const errorResult = addResult as { success: false; error: NikeError };
      return err(errorResult.error);
    }

    // Get updated wallet
    const wallet = await this.walletRepo.findByDid(did);
    if (!wallet) {
      return err(new NikeError('WALLET_NOT_FOUND', 'Wallet not found after mint'));
    }

    // Create transaction record
    const tx = new Transaction({
      type: 'MINT',
      amount,
      toDid: did,
      description: reason,
      signature: this.signFn(`${did}:${amount}:${Date.now()}`)
    });

    await this.txRepo.save(tx);

    return ok({
      txId: tx.id,
      newBalance: wallet.balance
    });
  }

  async transfer(fromDid: string, toDid: string, amount: number, memo?: string): Promise<Result<TransferResult, NikeError>> {
    // Subtract from sender
    const subResult = await this.walletRepo.subtractBalance(fromDid, amount);
    if (!subResult.success) {
      const errorResult = subResult as { success: false; error: NikeError };
      return err(errorResult.error);
    }

    // Add to receiver
    const addResult = await this.walletRepo.addBalance(toDid, amount);
    if (!addResult.success) {
      // Rollback would be needed here in production
      const errorResult = addResult as { success: false; error: NikeError };
      return err(errorResult.error);
    }

    // Get updated balances
    const fromWallet = await this.walletRepo.findByDid(fromDid);
    const toWallet = await this.walletRepo.findByDid(toDid);

    // Create transaction record
    const tx = new Transaction({
      type: 'TRANSFER',
      amount: -amount,
      fromDid,
      toDid,
      description: memo || 'Transfer',
      signature: this.signFn(`${fromDid}:${toDid}:${amount}:${Date.now()}`)
    });

    await this.txRepo.save(tx);

    return ok({
      txId: tx.id,
      fromBalance: fromWallet?.balance || 0,
      toBalance: toWallet?.balance || 0
    });
  }

  async getWallet(did: string): Promise<Result<Wallet, NikeError>> {
    const wallet = await this.walletRepo.findByDid(did);
    if (!wallet) {
      return err(new NikeError('WALLET_NOT_FOUND', 'Wallet not found'));
    }
    return ok(wallet);
  }
}
