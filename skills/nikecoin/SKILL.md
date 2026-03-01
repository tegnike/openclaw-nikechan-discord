---
name: nikecoin
description: ニケコイン管理スキル。残高確認、贈呈、送金、履歴確認などの操作を行う。「ニケコイン」「残高」「贈呈」などの指示があった場合に参照する。
allowed-tools: Bash
---

# NikeCoin v3 - ニケコイン管理

Clean Architectureベース、技術的負債ゼロの次世代システム。

## アーキテクチャ

```
nike_protocol_v3/
├── src/core/domain/      # 純粋ビジネスロジック
├── src/application/      # Commands/Queries
├── src/infrastructure/   # SQLite + AES-256-GCM暗号化
└── src/migration/        # v1/v2 → v3移行ツール
```

## データ構造

Encrypted SQLite (`~/.nike/coin_v3.db.enc`):
- `accounts`: did, discord_id, balance, total_received, total_sent, equipped_title
- `transactions`: tx_hash, from_did, to_did, amount, reason, metadata, timestamp, signature
- `gacha_inventory`: did, title_id, count, first_obtained_at, last_obtained_at
- `user_profiles`: did, username, display_name, timezone, nickname, notes

## CLI (v3)

```bash
cd /workspace/nike_protocol_v3

# 残高確認
node dist/cli.js coin:balance -d <discord_id>

# 送金
node dist/cli.js coin:send -f <from> -t <to> -a <amount> -m "memo"

# 履歴
node dist/cli.js coin:history -d <discord_id> -l 10

# mint (管理者)
node dist/cli.js coin:mint -d <discord_id> -a <amount> -m "reason"

# burn
node dist/cli.js coin:burn -d <discord_id> -a <amount> -m "reason"

# ガチャ
node dist/cli.js gacha:pull -d <discord_id> [--ten]

# 称号一覧
node dist/cli.js gacha:inventory -d <discord_id>

# データ移行 (dry-run)
npm run migrate -- --dry-run

# データ移行 (本番)
npm run migrate -- --source=~/.nike/coin_v2.db --target=~/.nike/coin_v3.db.enc
```

## API (v3)

```typescript
import { 
  TransferCoinCommand,
  PullGachaCommand,
  GetBalanceQuery,
  GetInventoryQuery 
} from './src/application';

// Commandパターン
const transferCmd = new TransferCoinCommand(walletRepo, txRepo, signFn);
const result = await transferCmd.execute({
  fromDiscordId: '123',
  toDiscordId: '456', 
  amount: 10,
  reason: 'ありがとう！'
});

// Queryパターン
const balanceQuery = new GetBalanceQuery(walletRepo);
const balance = await balanceQuery.execute('123');

// Gacha
const gachaCmd = new PullGachaCommand(walletRepo, gachaRepo);
const pullResult = await gachaCmd.execute({
  discordId: '123',
  isTenPull: true
});
```

## 特徴

- **DID**: `did:nike:discord:<discord_id>`
- **署名**: HMAC-SHA256（サーバー側）
- **暗号化**: AES-256-GCM
- **アーキテクチャ**: Clean Architecture / Repository Pattern
- **不変性**: Object.freeze()でドメインオブジェクト保護
- **エラーハンドリング**: neverthrow Result型
- **ガチャ**: 110種類の称号（SS:5, S:10, A:20, B:30, C:40）

## 環境変数

```bash
NIKECOIN_DB_KEY=<database-encryption-key>
NIKECOIN_SECRET=<hmac-signing-secret>
```

## ボット統合実装例（v3必須）

今後、ボットがコイン操作を行う際は必ずv3のApplication Serviceを経由してください。

```typescript
import { MintCoinCommand } from '/workspace/nike_protocol_v3/dist/application/commands/MintCoinCommand.js';
import { TransferCoinCommand } from '/workspace/nike_protocol_v3/dist/application/commands/TransferCoinCommand.js';
import { PullGachaCommand } from '/workspace/nike_protocol_v3/dist/application/commands/PullGachaCommand.js';
import { GetBalanceQuery } from '/workspace/nike_protocol_v3/dist/application/queries/GetBalanceQuery.js';
import { SQLiteWalletRepository } from '/workspace/nike_protocol_v3/dist/infrastructure/repositories/SQLiteWalletRepository.js';
import { SQLiteTransactionRepository } from '/workspace/nike_protocol_v3/dist/infrastructure/repositories/SQLiteTransactionRepository.js';
import { SQLiteGachaRepository } from '/workspace/nike_protocol_v3/dist/infrastructure/repositories/SQLiteGachaRepository.js';
import { createHmac } from 'crypto';

// シングルトンインスタンス（ボット起動時に初期化）
class NikeCoinService {
  private static instance: NikeCoinService;
  private walletRepo: SQLiteWalletRepository;
  private txRepo: SQLiteTransactionRepository;
  private gachaRepo: SQLiteGachaRepository;
  private signFn: (data: string) => string;

  private constructor() {
    const dbPath = '/workspace/.nike/coin_v3.db.enc';
    this.walletRepo = new SQLiteWalletRepository(dbPath);
    this.txRepo = new SQLiteTransactionRepository(dbPath);
    this.gachaRepo = new SQLiteGachaRepository(dbPath);
    
    this.signFn = (data: string) => {
      const secret = process.env.NIKECOIN_SECRET || 'default-secret';
      return createHmac('sha256', secret).update(data).digest('hex');
    };
  }

  static getInstance(): NikeCoinService {
    if (!NikeCoinService.instance) {
      NikeCoinService.instance = new NikeCoinService();
    }
    return NikeCoinService.instance;
  }

  // コイン贈呈（HEARTBEAT自動配布用）
  async mint(discordId: string, amount: number, reason: string) {
    const cmd = new MintCoinCommand(this.walletRepo, this.txRepo, this.signFn);
    return await cmd.execute({ discordId, amount, reason });
  }

  // 送金
  async transfer(fromId: string, toId: string, amount: number, reason: string) {
    const cmd = new TransferCoinCommand(this.walletRepo, this.txRepo, this.signFn);
    return await cmd.execute({ fromDiscordId: fromId, toDiscordId: toId, amount, reason });
  }

  // 残高確認
  async getBalance(discordId: string) {
    const query = new GetBalanceQuery(this.walletRepo);
    return await query.execute(discordId);
  }

  // ガチャ実行
  async pullGacha(discordId: string, isTenPull: boolean = false) {
    const cmd = new PullGachaCommand(this.walletRepo, this.gachaRepo);
    return await cmd.execute({ discordId, isTenPull });
  }
}

// 使用例
const coinService = NikeCoinService.getInstance();

// 自動配布
await coinService.mint('195028089577799680', 5, '面白い発言のご褒美');

// 送金
await coinService.transfer('123', '456', 10, 'ありがとう！');

// 残高確認
const balance = await coinService.getBalance('195028089577799680');
console.log(`残高: ${balance} coins`);

// ガチャ
const result = await coinService.pullGacha('195028089577799680', true);
console.log(`獲得称号: ${result.titles.map(t => t.name).join(', ')}`);
```

## 移行状況

- ✅ v3実装完了
- ✅ v1 → v3 価値移行完了（2026-03-01）
- ✅ 本番稼働開始
- 📝 v2データはバックアップ保持（復号キー特定後完全移行予定）
