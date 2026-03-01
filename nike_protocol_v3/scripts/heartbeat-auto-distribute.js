#!/usr/bin/env node
/**
 * HEARTBEAT自動配布スクリプト (v3)
 * 
 * 使い方:
 *   cd /workspace/nike_protocol_v3 && node ../scripts/heartbeat-auto-distribute.js [--dry-run]
 * 
 * 環境変数:
 *   NIKECOIN_DB_KEY - DB暗号化キー
 *   NIKECOIN_SECRET - HMAC署名用シークレット
 */

import Database from 'better-sqlite3';
import { createHmac } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// スクリプトの場所を基準にパス解決
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = dirname(SCRIPT_DIR);  // nike_protocol_v3ディレクトリ

// v3モジュールを動的インポート
const { MintCoinCommand } = await import(join(PROJECT_DIR, 'dist/application/commands/MintCoinCommand.js'));
const { SQLiteWalletRepository } = await import(join(PROJECT_DIR, 'dist/infrastructure/repositories/SQLiteWalletRepository.js'));

// 設定
const DB_PATH = '/workspace/.nike/coin_v3.db.enc';
const STATE_FILE = join(SCRIPT_DIR, '.heartbeat-state.json');
const DRY_RUN = process.argv.includes('--dry-run');

// 評価基準（めいちゃん哲学：軽率に付与OK）
const EVALUATION_CRITERIA = {
  casual: { min: 1, max: 3, label: '日常投稿' },
  funny: { min: 3, max: 5, label: '面白い発言' },
  helpful: { min: 5, max: 10, label: '有益情報' },
  creative: { min: 10, max: 20, label: 'クリエイティブ' },
  special: { min: 20, max: 50, label: '特別貢献' }
};

// 状態管理
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('状態ファイル読み込みエラー:', e.message);
  }
  return { lastRun: null, distributed: {} };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('状態ファイル保存エラー:', e.message);
  }
}

// 署名関数
function createSignFn() {
  const secret = process.env.NIKECOIN_SECRET || 'default-secret';
  return (data) => createHmac('sha256', secret).update(data).digest('hex');
}

// メイン処理
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Nike Protocol v3 - HEARTBEAT自動配布');
  console.log(`  モード: ${DRY_RUN ? 'DRY-RUN（テスト）' : '本番'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 状態読み込み
  const state = loadState();
  console.log(`前回実行: ${state.lastRun || '初回'}`);
  console.log(`DBパス: ${DB_PATH}`);
  console.log(`DB存在: ${fs.existsSync(DB_PATH) ? '✅' : '❌'}\n`);

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ データベースが見つかりません');
    process.exit(1);
  }

  // DB接続
  let db;
  try {
    db = new Database(DB_PATH);
  } catch (e) {
    console.error('❌ DB接続エラー:', e.message);
    process.exit(1);
  }

  // Repository初期化
  const walletRepo = new SQLiteWalletRepository(db);
  const signFn = createSignFn();

  // MintCoinCommand（トランザクションレポはnull許容）
  const mintCmd = new MintCoinCommand(walletRepo, null, signFn);

  // テスト配布（実際にはDiscordメッセージ解析結果を使う）
  console.log('【テスト配布】\n');
  
  const testDistributions = [
    { discordId: '195028089577799680', amount: 5, reason: 'HEARTBEATテスト: 面白い発言' },
    { discordId: '576031815945420812', amount: 3, reason: 'HEARTBEATテスト: 日常投稿' }
  ];

  for (const dist of testDistributions) {
    console.log(`対象: ${dist.discordId}`);
    console.log(`  金額: ${dist.amount}コイン`);
    console.log(`  理由: ${dist.reason}`);

    if (DRY_RUN) {
      console.log('  結果: ⏸️ DRY-RUN（スキップ）\n');
      continue;
    }

    try {
      const result = await mintCmd.execute({
        discordId: dist.discordId,
        amount: dist.amount,
        reason: dist.reason
      });

      if (result.isOk()) {
        console.log(`  結果: ✅ 成功 (tx: ${result.value.txHash.slice(0, 16)}...)`);
        
        // 状態更新
        if (!state.distributed[dist.discordId]) {
          state.distributed[dist.discordId] = [];
        }
        state.distributed[dist.discordId].push({
          amount: dist.amount,
          reason: dist.reason,
          txHash: result.value.txHash,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`  結果: ❌ 失敗 (${result.error.message})`);
      }
    } catch (e) {
      console.log(`  結果: ❌ 例外 (${e.message})`);
    }
    console.log('');
  }

  // 状態保存
  state.lastRun = new Date().toISOString();
  saveState(state);

  // サマリー
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  完了');
  console.log(`  実行時刻: ${state.lastRun}`);
  console.log('═══════════════════════════════════════════════════════════════');

  db.close();
}

main().catch(e => {
  console.error('致命的エラー:', e);
  process.exit(1);
});
