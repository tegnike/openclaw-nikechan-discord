import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { MintCoinCommand } from '../../application/commands/MintCoinCommand.js';
import { TransferCoinCommand } from '../../application/commands/TransferCoinCommand.js';
import { GetWalletQuery } from '../../application/queries/GetWalletQuery.js';
import { SQLiteWalletRepository } from '../../infrastructure/repositories/SQLiteWalletRepository.js';
import { InMemoryTransactionRepository } from '../../infrastructure/repositories/InMemoryTransactionRepository.js';

describe('【E2E統合テスト】Application + Infrastructure', () => {
  let db: Database.Database;
  let walletRepo: SQLiteWalletRepository;
  let txRepo: InMemoryTransactionRepository;
  let mintCmd: MintCoinCommand;
  let transferCmd: TransferCoinCommand;
  let getWalletQuery: GetWalletQuery;

  beforeEach(() => {
    db = new Database(':memory:');
    walletRepo = new SQLiteWalletRepository(db as any);
    txRepo = new InMemoryTransactionRepository();
    mintCmd = new MintCoinCommand(walletRepo, txRepo);
    transferCmd = new TransferCoinCommand(walletRepo);
    getWalletQuery = new GetWalletQuery(walletRepo);
  });

  it('完全なユースケース: 発行→照会→送金→照会', async () => {
    // Step 1: Mint coins to Alice
    const mintResult = await mintCmd.execute({
      discordId: 'alice',
      amount: 1000,
      reason: 'Initial deposit'
    });
    expect(mintResult.isOk()).toBe(true);

    // Step 2: Query Alice's wallet
    const aliceQuery = await getWalletQuery.execute('alice');
    expect(aliceQuery.isOk()).toBe(true);
    expect(aliceQuery._unsafeUnwrap().balance).toBe(1000);

    // Step 3: Transfer to Bob
    const transferResult = await transferCmd.execute({
      fromDiscordId: 'alice',
      toDiscordId: 'bob',
      amount: 350
    });
    expect(transferResult.isOk()).toBe(true);

    // Step 4: Verify both balances
    const [aliceFinal, bobFinal] = await Promise.all([
      getWalletQuery.execute('alice'),
      getWalletQuery.execute('bob')
    ]);

    expect(aliceFinal._unsafeUnwrap().balance).toBe(650);
    expect(bobFinal._unsafeUnwrap().balance).toBe(350);
  });

  it('エラーフロー: 残高不足後の状態整合性', async () => {
    // Setup: Alice has 100
    await mintCmd.execute({ discordId: 'alice', amount: 100, reason: 'Setup' });
    await mintCmd.execute({ discordId: 'bob', amount: 0, reason: 'Create' });

    // Try to transfer 200 (will fail)
    const failResult = await transferCmd.execute({
      fromDiscordId: 'alice',
      toDiscordId: 'bob',
      amount: 200
    });
    expect(failResult.isErr()).toBe(true);

    // Verify Alice still has 100 (no partial deduction)
    const aliceWallet = await getWalletQuery.execute('alice');
    expect(aliceWallet._unsafeUnwrap().balance).toBe(100);
  });

  it('負荷テスト: 100回の連続操作', async () => {
    await mintCmd.execute({ discordId: 'loadtest', amount: 10000, reason: 'Load test' });

    const operations = Array.from({ length: 100 }, (_, i) => {
      if (i % 2 === 0) {
        return mintCmd.execute({ 
          discordId: `user-${i}`, 
          amount: 10, 
          reason: 'Batch' 
        });
      } else {
        return getWalletQuery.execute('loadtest');
      }
    });

    const results = await Promise.all(operations);
    const successRate = results.filter(r => r.isOk()).length / results.length;
    
    expect(successRate).toBeGreaterThanOrEqual(0.95); // 95%+ success
  });
});
