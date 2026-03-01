import { describe, it, expect } from 'vitest';
import { MigrationOrchestrator, MigrationError } from '../../../migration/MigrationOrchestrator.js';
import { LegacyKeyResolver } from '../../../migration/LegacyKeyResolver.js';
import { DataTransformer } from '../../../migration/DataTransformer.js';
import type { LegacyAccount, LegacyTransaction, LegacyGachaPull } from '../../../migration/DataTransformer.js';

describe('Migration Simulation - 壊れかけたv2データからv3へ', () => {
  
  // 架空の壊れたv2データセット
  const createCorruptedV2Data = () => ({
    accounts: [
      // 正常なアカウント
      {
        did: 'did:nike:discord:normal_user',
        balance: 150,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-02-20T14:22:00Z'
      },
      // 負の残高（破損）
      {
        did: 'did:nike:discord:negative_balance',
        balance: -50,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-02-15T12:00:00Z'
      },
      // 極端に大きな残高（破損）
      {
        did: 'did:nike:discord:huge_balance',
        balance: 999999999999,
        created_at: '2024-01-05T09:00:00Z',
        updated_at: '2024-02-10T11:00:00Z'
      },
      // routersys - 手動補填対象
      {
        did: 'did:nike:discord:1248996049729880075',
        balance: 3,
        created_at: '2024-02-25T20:00:00Z',
        updated_at: '2024-03-01T05:00:00Z'
      },
      // 重複DID
      {
        did: 'did:nike:discord:duplicate_user',
        balance: 100,
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-02-25T15:00:00Z'
      },
      {
        did: 'did:nike:discord:duplicate_user', // 重複！
        balance: 200,
        created_at: '2024-01-21T11:00:00Z',
        updated_at: '2024-02-26T16:00:00Z'
      }
    ] as LegacyAccount[],
    transactions: [
      {
        id: 'tx-normal-001',
        from_did: null,
        to_did: 'did:nike:discord:normal_user',
        amount: 100,
        type: 'mint',
        timestamp: '2024-01-15T10:30:00Z'
      },
      {
        id: 'tx-normal-002',
        from_did: null,
        to_did: 'did:nike:discord:normal_user',
        amount: 50,
        type: 'mint',
        timestamp: '2024-02-20T14:22:00Z'
      },
      // 重複トランザクションID
      {
        id: 'tx-duplicate',
        from_did: null,
        to_did: 'did:nike:discord:normal_user',
        amount: 10,
        type: 'mint',
        timestamp: '2024-01-16T11:00:00Z'
      },
      {
        id: 'tx-duplicate', // 重複！
        from_did: null,
        to_did: 'did:nike:discord:negative_balance',
        amount: 20,
        type: 'mint',
        timestamp: '2024-01-17T12:00:00Z'
      }
    ] as LegacyTransaction[],
    gachaPulls: [
      {
        id: 'pull-001',
        user_did: 'did:nike:discord:normal_user',
        title_id: 'c001',
        pulled_at: '2024-02-01T10:00:00Z'
      },
      {
        id: 'pull-002',
        user_did: 'did:nike:discord:normal_user',
        title_id: 'b005',
        pulled_at: '2024-02-10T15:00:00Z'
      },
      // 存在しない称号ID
      {
        id: 'pull-bad',
        user_did: 'did:nike:discord:normal_user',
        title_id: 'xyz999',
        pulled_at: '2024-02-15T16:00:00Z'
      }
    ] as LegacyGachaPull[]
  });

  describe('シミュレーション実行', () => {
    it('壊れたデータセットの検証でエラーを検出', () => {
      const data = createCorruptedV2Data();
      
      const validation = DataTransformer.validateDataset(
        data.accounts,
        data.transactions,
        data.gachaPulls
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2); // DID重複 + TX重複
      
      console.log('検出された問題:');
      validation.errors.forEach((e) => {
        console.log(`  - ${e.type}: ${e.message}`);
      });
    });

    it('変換時に無効なアカウントはスキップされる', () => {
      const data = createCorruptedV2Data();
      
      // 重複を除去してテスト
      const uniqueAccounts = data.accounts.filter((a, i, arr) => 
        arr.findIndex(t => t.did === a.did) === i
      );
      
      const result = DataTransformer.transform(
        uniqueAccounts,
        data.transactions,
        data.gachaPulls
      );

      // 有効なアカウントのみが変換される
      expect(result.wallets.length).toBe(3); // normal, routersys, duplicate_user
      expect(result.stats.invalidRecords).toBeGreaterThanOrEqual(2); // negative, huge
      expect(result.success).toBe(false); // エラーがあるため
    });

    it('routersysの手動補填が正しく適用される', () => {
      const data = createCorruptedV2Data();
      
      const uniqueAccounts = data.accounts.filter((a, i, arr) => 
        arr.findIndex(t => t.did === a.did) === i
      );
      
      const result = DataTransformer.transform(
        uniqueAccounts,
        data.transactions,
        data.gachaPulls
      );

      const routersysWallet = result.wallets.find(
        w => w.did === 'did:nike:discord:1248996049729880075'
      );

      expect(routersysWallet).toBeDefined();
      expect(routersysWallet!.balance.amount).toBe(53); // 3 + 50
      
      // 補填トランザクションの確認
      const compTx = routersysWallet!.transactions.find(
        tx => tx.metadata?.includes('COMPENSATION_V2_BUG')
      );
      expect(compTx).toBeDefined();
      expect(compTx!.amount).toBe(50);
    });

    it('正常なユーザーのデータ整合性が保たれる', () => {
      const data = createCorruptedV2Data();
      
      const uniqueAccounts = data.accounts.filter((a, i, arr) => 
        arr.findIndex(t => t.did === a.did) === i
      );
      
      const result = DataTransformer.transform(
        uniqueAccounts,
        data.transactions,
        data.gachaPulls
      );

      const normalUser = result.wallets.find(
        w => w.did === 'did:nike:discord:normal_user'
      );

      expect(normalUser).toBeDefined();
      expect(normalUser!.balance.amount).toBe(150);
      expect(normalUser!.transactions.length).toBe(3); // 通常2件 + 重複1件
      expect(normalUser!.titles.length).toBe(2); // c001, b005（xyz999は無視）
    });

    it('統計情報が正確に集計される', () => {
      const data = createCorruptedV2Data();
      
      const uniqueAccounts = data.accounts.filter((a, i, arr) => 
        arr.findIndex(t => t.did === a.did) === i
      );
      
      const result = DataTransformer.transform(
        uniqueAccounts,
        data.transactions,
        data.gachaPulls
      );

      expect(result.stats.totalAccounts).toBe(5); // 重複除去後
      expect(result.stats.validWallets).toBe(3);
      expect(result.stats.invalidRecords).toBeGreaterThanOrEqual(2);
      expect(result.stats.manualCompensations).toBe(1);
      expect(result.stats.totalTitles).toBe(2); // 正常ユーザーが2つ持っている
    });
  });

  describe('暗号化キー解決のシミュレーション', () => {
    it('環境変数がない場合は失敗する', () => {
      const originalEnv = process.env.NIKE_COIN_ENCRYPTION_KEY;
      const originalPass = process.env.NIKE_COIN_PASSWORD;
      delete process.env.NIKE_COIN_ENCRYPTION_KEY;
      delete process.env.NIKE_COIN_PASSWORD;

      const result = LegacyKeyResolver.resolveV2();

      expect(result.success).toBe(false);
      expect(result.source).toBe('none');

      // Restore
      if (originalEnv) process.env.NIKE_COIN_ENCRYPTION_KEY = originalEnv;
      if (originalPass) process.env.NIKE_COIN_PASSWORD = originalPass;
    });

    it('正しい形式のHEXキーで成功する', () => {
      const originalEnv = process.env.NIKE_COIN_ENCRYPTION_KEY;
      process.env.NIKE_COIN_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex

      const result = LegacyKeyResolver.resolveV2();

      expect(result.success).toBe(true);
      expect(result.source).toBe('env');
      expect(result.key?.length).toBe(32);

      // Restore
      if (originalEnv) {
        process.env.NIKE_COIN_ENCRYPTION_KEY = originalEnv;
      } else {
        delete process.env.NIKE_COIN_ENCRYPTION_KEY;
      }
    });
  });
});
