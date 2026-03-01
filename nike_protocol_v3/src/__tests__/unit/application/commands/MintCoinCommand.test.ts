import { describe, it, expect, beforeEach } from 'vitest';
import { MintCoinCommand } from '../../../../application/commands/MintCoinCommand.js';
import { InMemoryWalletRepository } from '../../../../infrastructure/repositories/InMemoryWalletRepository.js';
import { InMemoryTransactionRepository } from '../../../../infrastructure/repositories/InMemoryTransactionRepository.js';

describe('MintCoinCommand - Application Layer', () => {
  let walletRepo: InMemoryWalletRepository;
  let txRepo: InMemoryTransactionRepository;
  let command: MintCoinCommand;

  beforeEach(() => {
    walletRepo = new InMemoryWalletRepository();
    txRepo = new InMemoryTransactionRepository();
    command = new MintCoinCommand(walletRepo, txRepo);
  });

  describe('正常系: 有効な入力', () => {
    it('新規ユーザーにコインを発行', async () => {
      const result = await command.execute({
        discordId: '123456789',
        amount: 100,
        reason: 'Test minting'
      });

      expect(result.isOk()).toBe(true);
      
      const wallet = (await walletRepo.findByDID('did:nike:discord:123456789'))._unsafeUnwrap();
      expect(wallet.balance.amount).toBe(100);
    });

    it('既存ユーザーの残高に加算', async () => {
      // First mint
      await command.execute({ discordId: 'user1', amount: 50, reason: 'First' });
      
      // Second mint
      const result = await command.execute({ discordId: 'user1', amount: 30, reason: 'Second' });
      
      expect(result.isOk()).toBe(true);
      const wallet = (await walletRepo.findByDID('did:nike:discord:user1'))._unsafeUnwrap();
      expect(wallet.balance.amount).toBe(80);
    });

    it('最大値での発行（境界値）', async () => {
      const result = await command.execute({
        discordId: 'maxuser',
        amount: 10000,
        reason: 'Max boundary test'
      });

      expect(result.isOk()).toBe(true);
    });
  });

  describe('異常系: 不正な入力検証', () => {
    it('空のDiscord IDは拒否', async () => {
      const result = await command.execute({
        discordId: '',
        amount: 100,
        reason: 'Test'
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('Discord ID');
    });

    it('負の金額は拒否', async () => {
      const result = await command.execute({
        discordId: 'user1',
        amount: -50,
        reason: 'Test'
      });

      expect(result.isErr()).toBe(true);
    });

    it('小数点の金額は拒否', async () => {
      const result = await command.execute({
        discordId: 'user1',
        amount: 10.5,
        reason: 'Test'
      });

      expect(result.isErr()).toBe(true);
    });

    it('上限超過の金額は拒否', async () => {
      const result = await command.execute({
        discordId: 'user1',
        amount: 10001,
        reason: 'Too much'
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toContain('10000');
    });

    it('短すぎる理由は拒否', async () => {
      const result = await command.execute({
        discordId: 'user1',
        amount: 100,
        reason: 'ab'
      });

      expect(result.isErr()).toBe(true);
    });

    it('ゼロ金額は拒否', async () => {
      const result = await command.execute({
        discordId: 'user1',
        amount: 0,
        reason: 'Zero test'
      });

      expect(result.isErr()).toBe(true);
    });
  });

  describe('セキュリティ: 攻撃耐性', () => {
    it('SQLインジェクション風のIDは文字列として処理', async () => {
      const result = await command.execute({
        discordId: "'; DROP TABLE wallets; --",
        amount: 100,
        reason: 'Injection test'
      });

      // Should succeed as the ID is just a string
      expect(result.isOk()).toBe(true);
      const did = "did:nike:discord:'; DROP TABLE wallets; --";
      const wallet = (await walletRepo.findByDID(did))._unsafeUnwrap();
      expect(wallet).toBeDefined();
    });

    it('非常に長い理由も受け入れる', async () => {
      const longReason = 'a'.repeat(1000);
      const result = await command.execute({
        discordId: 'user1',
        amount: 100,
        reason: longReason
      });

      expect(result.isOk()).toBe(true);
    });

    it('特殊文字を含むDiscord IDも処理', async () => {
      const result = await command.execute({
        discordId: 'user@#$%^&*()',
        amount: 50,
        reason: 'Special chars test'
      });

      expect(result.isOk()).toBe(true);
    });
  });
});
