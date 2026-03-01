import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import { SQLiteWalletRepository } from '../../infrastructure/repositories/SQLiteWalletRepository.js';
import { MintCoinCommand } from '../../application/commands/MintCoinCommand.js';
import { TransferCoinCommand } from '../../application/commands/TransferCoinCommand.js';
import { InMemoryTransactionRepository } from '../../infrastructure/repositories/InMemoryTransactionRepository.js';

describe('【敵対的検証】レースコンディション破壊テスト', () => {
  const TEST_DB_PATH = '/tmp/race_test.db';
  
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('100並列Mintで二重発行が発生するか（実ファイル）', async () => {
    const db = new Database(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');
    
    const walletRepo = new SQLiteWalletRepository(db as any);
    const txRepo = new InMemoryTransactionRepository();
    const mintCmd = new MintCoinCommand(walletRepo, txRepo);

    await mintCmd.execute({ discordId: 'alice', amount: 0, reason: 'Init' });

    const promises = Array.from({ length: 100 }, (_, i) => 
      mintCmd.execute({ discordId: 'alice', amount: 10, reason: `Mint ${i}` })
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.isOk()).length;

    db.close();
    const db2 = new Database(TEST_DB_PATH);
    const finalRepo = new SQLiteWalletRepository(db2 as any);
    const finalWallet = (await finalRepo.findByDID('did:nike:discord:alice'))._unsafeUnwrap();

    console.log(`\n[レース条件検証] 成功:${successCount} 残高:${finalWallet.balance.amount} 期待:${successCount * 10}`);
    expect(finalWallet.balance.amount).toBe(successCount * 10);
    db2.close();
  });
});
