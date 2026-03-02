# ReNikeProtocol 技術仕様書

## 概要

ReNikeProtocolは、NikeCoinシステムの洗練された再実装です。
過剰な抽象化を排除しつつ、機能性と信頼性を両立させた設計を目指しています。

## ディレクトリ構造

```
renike_protocol/
├── src/
│   ├── core/
│   │   ├── types.ts          # ドメイン型定義
│   │   └── errors.ts         # エラー定義
│   ├── db/
│   │   └── connection.ts     # SQLite接続・初期化
│   ├── repositories/
│   │   ├── wallet.ts         # 残高・取引管理
│   │   ├── inventory.ts      # 称号インベントリ
│   │   └── profile.ts        # ユーザープロファイル
│   ├── services/
│   │   └── coin.ts           # ビジネスロジック
│   ├── gacha/
│   │   ├── titles.ts         # 110種称号データ
│   │   └── engine.ts         # 排出率ロジック
│   ├── cli/
│   │   └── commands.ts       # CLI実装
│   └── index.ts              # エントリーポイント
├── dist/                     # コンパイル済みJS
├── data/                     # SQLiteデータベース
└── package.json
```

## データベーススキーマ

### wallets
| カラム | 型 | 制約 |
|:---|:---|:---|
| did | TEXT | PRIMARY KEY |
| balance | INTEGER | DEFAULT 0, CHECK(balance >= 0) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### transactions
| カラム | 型 | 制約 |
|:---|:---|:---|
| id | TEXT | PRIMARY KEY |
| type | TEXT | CHECK(type IN ('MINT', 'TRANSFER', 'GACHA')) |
| amount | INTEGER | CHECK(amount > 0) |
| from_did | TEXT | nullable |
| to_did | TEXT | nullable |
| description | TEXT | - |
| signature | TEXT | NOT NULL |
| timestamp | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### inventories
| カラム | 型 | 制約 |
|:---|:---|:---|
| did | TEXT | PRIMARY KEY |
| items | TEXT | DEFAULT '[]' (JSON配列) |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### user_profiles
| カラム | 型 | 制約 |
|:---|:---|:---|
| did | TEXT | PRIMARY KEY |
| display_name | TEXT | nullable |
| total_minted | INTEGER | DEFAULT 0 |
| total_spent | INTEGER | DEFAULT 0 |
| gacha_count | INTEGER | DEFAULT 0 |
| last_active_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

## 各モジュールの責務

### core/types.ts
- ドメイン全体で使用される型定義
- DID、Wallet、Transaction、Title等の基本型

### core/errors.ts
- NikeError基底クラス
- 業務固有のエラークラス（InsufficientBalanceError等）

### db/connection.ts
- SQLiteデータベース接続管理
- トランザクション制御（withTransaction）
- WALモード設定による原子性保証

### repositories/wallet.ts
- 残高照会・更新
- 送金処理（アトミック）
- 発行処理
- 取引履歴管理

### repositories/inventory.ts
- 称号所有管理
- JSON形式での永続化
- コレクション進捗計算

### repositories/profile.ts
- ユーザー統計情報管理
- HEARTBEAT連携基盤（lastActiveAt, totalMinted等）
- リーダーボード機能

### services/coin.ts
- OperationResultパターンによる統一的な応答
- サービス層でのビジネスロジック集約

### gacha/titles.ts
- 110種称号データ定義
- 排出率設定
- レアリティ別フィルタリング

### gacha/engine.ts
- 決定論的乱数生成（テスト用シード対応）
- 天井システム（10連目のA以上保証）
- 統計情報計算

### cli/commands.ts
- 構造化ログ出力（JSON形式）
- 全CLIコマンド実装
- エラーハンドリング

## CLIコマンド一覧

### balance `<did>`
ウォレット残高を確認する。

```bash
$ renike balance did:nike:discord:123456
# または
$ renike balance 123456
```

**出力例:**
```json
{
  "timestamp": "2026-03-01T12:00:00.000Z",
  "operation": "balance",
  "input": { "did": "did:nike:discord:123456" },
  "output": { "balance": 1500 },
  "success": true,
  "durationMs": 5
}
```

### mint `<did>` `<amount>` `[description]`
管理者用コイン発行コマンド。

```bash
$ renike mint did:nike:discord:123456 1000 "Genesis"
```

**出力例:**
```json
{
  "timestamp": "2026-03-01T12:00:00.000Z",
  "operation": "mint",
  "input": {
    "did": "did:nike:discord:123456",
    "amount": 1000,
    "description": "Genesis"
  },
  "output": {
    "newBalance": 1000,
    "txId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "success": true,
  "durationMs": 15
}
```

### transfer `<from>` `<to>` `<amount>` `[description]`
コインを送金する。

```bash
$ renike transfer 123456 789012 100 "Thanks!"
```

**出力例:**
```json
{
  "timestamp": "2026-03-01T12:00:00.000Z",
  "operation": "transfer",
  "input": {
    "fromDid": "did:nike:discord:123456",
    "toDid": "did:nike:discord:789012",
    "amount": 100,
    "description": "Thanks!"
  },
  "output": {
    "fromBalance": 900,
    "toBalance": 1100,
    "txId": "550e8400-e29b-41d4-a716-446655440001"
  },
  "success": true,
  "durationMs": 23
}
```

### history `<did>` `[limit]`
取引履歴を表示する。

```bash
$ renike history 123456 10
```

### gacha `<did>`
ガチャ10連を実行する（100コイン消費）。

```bash
$ renike gacha 123456
```

**出力例:**
```json
{
  "timestamp": "2026-03-01T12:00:00.000Z",
  "operation": "gacha",
  "input": { "did": "did:nike:discord:123456", "cost": 100 },
  "output": {
    "pulls": [
      { "id": "c_001", "rarity": "C", "isNew": true },
      { "id": "b_015", "rarity": "B", "isNew": true },
      ...
    ],
    "newBalance": 1400
  },
  "success": true,
  "durationMs": 45
}
```

コンソール出力:
```
🎰 Gacha Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ⚪ [C] 沈黙の達人 ✨NEW
2. 🔵 [B] 瞑想家 ✨NEW
...
10. 🟡 [A] コインホルダー ✨NEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Balance: 1500 → 1400
```

### inventory `<did>`
称号コレクションを表示する。

```bash
$ renike inventory 123456
```

**出力例:**
```
🎒 Collection: 15/110 (14%)
────────────────────────────────────────
🔴 SS: 0/5
🟠 S: 1/10
🟡 A: 3/20
🔵 B: 5/30
⚪ C: 6/45
```

### titles
全称号一覧を表示する。

```bash
$ renike titles
```

### stats
ガチャ統計情報を表示する。

```bash
$ renike stats
```

**出力例:**
```
📊 Gacha Statistics:
Total titles: 110
Expected cost for SS: 10000 coins

Drop rates:
  SS: 5 types (1.0%)
  S: 10 types (3.0%)
  A: 20 types (10.0%)
  B: 30 types (26.0%)
  C: 45 types (60.0%)
```

## セキュリティ対策

### SQLインジェクション対策
- 全てのクエリでプレースホルダ（?）を使用
- 文字列結合によるSQL構築を禁止

```typescript
// ✅ 正しい
await db.get('SELECT * FROM wallets WHERE did = ?', did);

// ❌ 誤り
await db.get(`SELECT * FROM wallets WHERE did = '${did}'`);
```

### アトミックな状態保存
- WAL（Write-Ahead Logging）モード有効化
- withTransactionユーティリティによる明示的トランザクション
- プロセス強制終了時もデータ整合性を保持

### HMAC署名
- 全取引にHMAC-SHA256署名を付与
- 改竄検出可能

## HEARTBEAT連携基盤

ProfileRepositoryが以下の統計を管理:
- `totalMinted`: 累積発行量
- `totalSpent`: 累積消費量
- `gachaCount`: ガチャ実行回数
- `lastActiveAt`: 最終活動時刻

これらのデータを元に、HEARTBEAT自動配布ロジックが動作する。

## ガチャ仕様

### 排出率
| レアリティ | 確率 | 種類数 |
|:---|:---|:---|
| SS | 1% | 5 |
| S | 3% | 10 |
| A | 10% | 20 |
| B | 26% | 30 |
| C | 60% | 45 |
| **合計** | **100%** | **110** |

### 天井システム
- 10連の10枚目は、前9枚にA以上が出ていない場合、A以上を強制排出
- 自然な確率でA以上が出た場合は通常通り

## 環境変数

| 変数名 | 説明 | デフォルト |
|:---|:---|:---|
| RENIKE_DB_PATH | データベースファイルパス | ./data/renike.db |
| RENIKE_SECRET | HMAC署名用秘密鍵 | default-secret |

## バージョン情報

- Protocol: ReNikeProtocol v1.0.0
- Node.js: ES2022/NodeNext
- Database: SQLite3 with WAL mode
