import { describe, it, expect } from 'vitest';
import { DataTransformer } from '../../../migration/DataTransformer.js';
import type { LegacyAccount, LegacyTransaction, LegacyGachaPull } from '../../../migration/DataTransformer.js';

describe('DataTransformer - 混沌の検証', () => {
  describe('悪意ある入力への耐性', () => {
    it('負の残高を持つアカウントは拒否される', () => {
      const accounts: LegacyAccount[] = [{
        did: 'did:nike:discord:test',
        balance: -100,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      const result = DataTransformer.transform(accounts, [], []);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('INVALID_BALANCE');
      expect(result.stats.validWallets).toBe(0);
    });

    it('極端に大きな残高は拒否される（1B超過）', () => {
      const accounts: LegacyAccount[] = [{
        did: 'did:nike:discord:test',
        balance: 2000000000, // 2B
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      const result = DataTransformer.transform(accounts, [], []);
      
      expect(result.success).toBe(false);
      expect(result.errors[0].type).toBe('INVALID_BALANCE');
    });

    it('小数点以下の残高は拒否される', () => {
      const accounts: LegacyAccount[] = [{
        did: 'did:nike:discord:test',
        balance: 100.5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      const result = DataTransformer.transform(accounts, [], []);
      
      expect(result.success).toBe(false);
      expect(result.errors[0].type).toBe('INVALID_BALANCE');
    });

    it('重複したDIDを検出する', () => {
      const accounts: LegacyAccount[] = [
        {
          did: 'did:nike:discord:duplicate',
          balance: 100,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          did: 'did:nike:discord:duplicate',
          balance: 200,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];

      const validation = DataTransformer.validateDataset(accounts, [], []);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBe(1);
      expect(validation.errors[0].type).toBe('DUPLICATE_ID');
    });

    it('重複したトランザクションIDを検出する', () => {
      const transactions: LegacyTransaction[] = [
        {
          id: 'tx-duplicate',
          from_did: null,
          to_did: 'did:nike:discord:user1',
          amount: 10,
          type: 'mint',
          timestamp: '2024-01-01T00:00:00Z'
        },
        {
          id: 'tx-duplicate',
          from_did: null,
          to_did: 'did:nike:discord:user2',
          amount: 20,
          type: 'mint',
          timestamp: '2024-01-02T00:00:00Z'
        }
      ];

      const validation = DataTransformer.validateDataset([], transactions, []);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors[0].type).toBe('DUPLICATE_ID');
    });

    it('存在しない称号IDは警告されるが処理は継続', () => {
      const accounts: LegacyAccount[] = [{
        did: 'did:nike:discord:test',
        balance: 100,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      const gachaPulls: LegacyGachaPull[] = [
        {
          id: 'pull-1',
          user_did: 'did:nike:discord:test',
          title_id: 'nonexistent_title',
          pulled_at: '2024-01-01T00:00:00Z'
        }
      ];

      const result = DataTransformer.transform(accounts, [], gachaPulls);
      
      // 処理は成功するが、エラーログに記録
      expect(result.wallets.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].type).toBe('UNKNOWN_TITLE');
      expect(result.wallets[0].titles.length).toBe(0);
    });

    it('空のアカウントリストでも安全に処理', () => {
      const result = DataTransformer.transform([], [], []);
      
      expect(result.success).toBe(true);
      expect(result.wallets.length).toBe(0);
      expect(result.stats.totalAccounts).toBe(0);
    });

    it('手動補填が正しく適用される（routersys +50）', () => {
      const accounts: LegacyAccount[] = [{
        did: 'did:nike:discord:1248996049729880075', // routersys
        balance: 3,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      const result = DataTransformer.transform(accounts, [], []);
      
      expect(result.success).toBe(true);
      expect(result.wallets.length).toBe(1);
      expect(result.wallets[0].balance.amount).toBe(53); // 3 + 50
      expect(result.stats.manualCompensations).toBe(1);
      
      // 補填トランザクションが生成されている
      const compensationTx = result.wallets[0].transactions.find(
        tx => tx.metadata?.includes('COMPENSATION_V2_BUG')
      );
      expect(compensationTx).toBeDefined();
      expect(compensationTx?.amount).toBe(50);
    });

    it('不正なJSONメタデータを含むトランザクション', () => {
      const accounts: LegacyAccount[] = [{
        did: 'did:nike:discord:test',
        balance: 100,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      const transactions: LegacyTransaction[] = [{
        id: 'tx-bad-meta',
        from_did: null,
        to_did: 'did:nike:discord:test',
        amount: 10,
        type: 'mint',
        timestamp: '2024-01-01T00:00:00Z',
        metadata: '{invalid json}'
      }];

      // メタデータが壊れていても処理は継続
      const result = DataTransformer.transform(accounts, transactions, []);
      
      expect(result.wallets.length).toBe(1);
      expect(result.wallets[0].transactions.length).toBe(1);
    });

    it('大量データでのパフォーマンス（1000アカウント）', () => {
      const accounts: LegacyAccount[] = Array.from({ length: 1000 }, (_, i) => ({
        did: `did:nike:discord:user${i}`,
        balance: Math.floor(Math.random() * 1000),
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));

      const start = Date.now();
      const result = DataTransformer.transform(accounts, [], []);
      const duration = Date.now() - start;

      expect(result.wallets.length).toBe(1000);
      expect(duration).toBeLessThan(1000); // 1秒以内
    });
  });
});
