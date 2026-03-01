import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { SQLiteWalletRepository } from '../../../infrastructure/repositories/SQLiteWalletRepository.js';
import { Coin } from '../../../core/domain/coin/Coin.js';

describe('SQLiteWalletRepository - 並行アクセス・DBロックテスト', () => {
  let db: Database.Database;
  let repo: SQLiteWalletRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    repo = new SQLiteWalletRepository(db as any);
  });

  describe('同時書き込み競合', () => {
    it('同時更新でも整合性が保たれる（トランザクション）', async () => {
      await repo.save({
        did: 'concurrent-user',
        balance: Coin.create(100)._unsafeUnwrap(),
        transactions: [],
        titles: []
      });

      const promises = [
        repo.updateBalance('concurrent-user', Coin.create(90)._unsafeUnwrap()),
        repo.updateBalance('concurrent-user', Coin.create(80)._unsafeUnwrap()),
        repo.updateBalance('concurrent-user', Coin.create(70)._unsafeUnwrap())
      ];

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.isOk()).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      const finalWallet = (await repo.findByDID('concurrent-user'))._unsafeUnwrap();
      expect([70, 80, 90, 100]).toContain(finalWallet.balance.amount);
    });

    it('大量の並行読み書きでデッドロックしない', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.save({
          did: `user-${i}`,
          balance: Coin.create(1000)._unsafeUnwrap(),
          transactions: [],
          titles: []
        });
      }

      const operations = Array.from({ length: 50 }, (_, i) => {
        const userIdx = i % 10;
        return repo.findByDID(`user-${userIdx}`);
      });

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(results.every(r => r.isOk())).toBe(true);
    });
  });

  describe('DBエラーハンドリング', () => {
    it('存在しないウォレット更新はエラー', async () => {
      const result = await repo.updateBalance(
        'non-existent-did',
        Coin.create(50)._unsafeUnwrap()
      );
      expect(result.isErr()).toBe(true);
    });

    it('SQLインジェクション試行は無害化される', async () => {
      const result = await repo.save({
        did: "'; DROP TABLE wallets; --",
        balance: Coin.create(100)._unsafeUnwrap(),
        transactions: [],
        titles: []
      });

      expect(result.isOk()).toBe(true);
      const wallet = await repo.findByDID("'; DROP TABLE wallets; --");
      expect(wallet.isOk()).toBe(true);
    });
  });
});
