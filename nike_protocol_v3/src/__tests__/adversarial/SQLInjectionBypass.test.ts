import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import { SQLiteWalletRepository } from '../../infrastructure/repositories/SQLiteWalletRepository.js';

/**
 * 【敵対的検証】SQLインジェクション限界突破テスト
 * 
 * ORM/プレースホルダをバイパスする攻撃を試行し、
 * エラーを吐かずに素通りするケースを発見する
 */
describe('【敵対的検証】SQLインジェクション限界突破', () => {
  const TEST_DB_PATH = '/tmp/sqli_test.db';

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('Unicode正規化攻撃: 同じ見た目の文字でバイパス', async () => {
    const db = new Database(TEST_DB_PATH);
    const repo = new SQLiteWalletRepository(db as any);

    // Fullwidth vs Halfwidth Unicode characters
    const attacks = [
      { name: '通常のコメント', input: "'; DROP TABLE wallets; --" },
      { name: 'Unicode全角', input: "';　ＤＲＯＰ　ＴＡＢＬＥ　ｗａｌｌｅｔｓ；　--" },
      { name: 'Null byte注入', input: "user%00'; DROP TABLE wallets; --" },
      { name: 'URL encoding', input: "%27%3B%20DROP%20TABLE%20wallets%3B%20--" },
      { name: 'Double encoding', input: "%2527%253B%2520DROP%2520TABLE..." },
    ];

    console.log('\n[Unicode/エンコーディング攻撃結果]');
    for (const attack of attacks) {
      try {
        const result = await repo.save({
          did: `did:nike:discord:${attack.input}`,
          balance: { amount: 100 } as any,
          transactions: [],
          titles: []
        });

        // Check if table still exists
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='wallets'").get();
        const tableExists = !!tableCheck;

        console.log(`  ${attack.name}: ${result.isOk() ? '✓ 保存成功' : '✗ 失敗'} | テーブル存在: ${tableExists}`);
        expect(tableExists).toBe(true);
      } catch (e) {
        console.log(`  ${attack.name}: ✗ 例外発生 - ${(e as Error).message.substring(0, 50)}`);
      }
    }
    db.close();
  });

  it('型混在攻撃: 数値として解釈される入力', async () => {
    const db = new Database(TEST_DB_PATH);
    const repo = new SQLiteWalletRepository(db as any);

    // Inputs that might be interpreted as numbers
    const numericAttacks = [
      { input: "123", expected: "number-like string" },
      { input: "1e10", expected: "scientific notation" },
      { input: "0x1A", expected: "hexadecimal" },
      { input: "Infinity", expected: "Infinity constant" },
      { input: "NaN", expected: "NaN constant" },
    ];

    console.log('\n[型混在攻撃結果]');
    for (const attack of numericAttacks) {
      const result = await repo.findByDID(`did:nike:discord:${attack.input}`);
      console.log(`  ${attack.expected} (${attack.input}): ${result.isOk() ? '✓ 処理完了' : '✗ エラー'}`);
      
      // All should succeed as they're just strings
      expect(result.isOk()).toBe(true);
    }
    db.close();
  });

  it('SQLite固有の攻撃: PRAGMA/cipherコマンド注入', async () => {
    const db = new Database(TEST_DB_PATH);
    const repo = new SQLiteWalletRepository(db as any);

    const pragmaAttacks = [
      "'; PRAGMA journal_mode=DELETE; --",
      "'; PRAGMA key=''; --",  // Try to decrypt without key
      "'; PRAGMA cipher_page_size=1024; --",
      "normal_user'; ATTACH DATABASE '/etc/passwd' AS pw; --",
    ];

    console.log('\n[SQLite固有攻撃結果]');
    for (const attack of pragmaAttacks) {
      try {
        const result = await repo.save({
          did: `did:nike:discord:${attack}`,
          balance: { amount: 1 } as any,
          transactions: [],
          titles: []
        });

        // Check if PRAGMA was executed
        const journalMode = db.pragma('journal_mode') as string;
        console.log(`  攻撃: ${attack.substring(0, 40)}...`);
        console.log(`    → 結果: ${result.isOk() ? '保存成功' : '失敗'} | journal_mode: ${journalMode}`);

        // If journal_mode changed, we have a vulnerability!
        expect(journalMode).toBe('wal'); // Should remain WAL
      } catch (e) {
        console.log(`  攻撃失敗: ${(e as Error).message.substring(0, 50)}`);
      }
    }
    db.close();
  });

  it('エラーメッセージ情報漏洩: 詳細なDB構造が露出するか', async () => {
    const db = new Database(TEST_DB_PATH);
    const repo = new SQLiteWalletRepository(db as any);

    // Try operations that might leak schema info in error messages
    const infoLeakTests = [
      { desc: '存在しないカラム参照', fn: () => db.prepare("SELECT secret_column FROM wallets").get() },
      { desc: '不正なテーブル参照', fn: () => db.prepare("SELECT * FROM sqlite_master").all() },
      { desc: '型不一致', fn: () => db.prepare("INSERT INTO wallets (did, balance) VALUES (1, 'text')").run() },
    ];

    console.log('\n[情報漏洩チェック]');
    for (const test of infoLeakTests) {
      try {
        test.fn();
        console.log(`  ${test.desc}: エラーなし（予期せぬ成功）`);
      } catch (e) {
        const msg = (e as Error).message;
        const hasSchemaInfo = msg.includes('column') || msg.includes('table') || msg.includes('schema');
        console.log(`  ${test.desc}: ${hasSchemaInfo ? '⚠️ スキーマ情報含む' : '○ 一般的エラー'}`);
        console.log(`    メッセージ: ${msg.substring(0, 60)}`);
      }
    }
    db.close();
  });

  it('現在の実装の脆弱性: 動的SQL生成の有無', async () => {
    // Read the actual repository implementation
    const repoCode = fs.readFileSync(
      '/workspace/nike_protocol_v3/src/infrastructure/repositories/SQLiteWalletRepository.ts',
      'utf8'
    );

    console.log('\n[実装脆弱性分析]');
    
    const usesTemplateLiteral = repoCode.includes('`${') && repoCode.includes('sql');
    const usesPrepare = repoCode.includes('.prepare(');
    const usesParameterizedQuery = repoCode.includes('?') || repoCode.includes('$');
    const hasStringConcatenation = repoCode.includes('+') && repoCode.includes('sql');

    console.log(`  テンプレートリテラル使用: ${usesTemplateLiteral ? '⚠️ 危険' : '○ なし'}`);
    console.log(`  prepare()使用: ${usesPrepare ? '○ あり' : '❌ 欠落'}`);
    console.log(`  パラメータ化クエリ: ${usesParameterizedQuery ? '○ あり' : '❌ 欠落'}`);
    console.log(`  文字列連結: ${hasStringConcatenation ? '⚠️ 危険' : '○ なし'}`);

    // Document findings
    expect(usesPrepare).toBe(true);
  });
});
