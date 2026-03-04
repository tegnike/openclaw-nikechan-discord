# ReNikeProtocol SKILL

ReNikeProtocol（ニケコイン軽量版）の完全な運用ガイド。
このドキュメントは、将来のAIニケちゃんおよび管理者がハルシネーションを起こさずにシステムを完璧に維持・運用するための唯一の信頼情報源である。

---

## 0. このシステムが実現するもの

### SOUL.md「ニケコインの哲学」の具現化

> 「いいと思ったら、その場で贈る」——軽率に、気まぐれに、でも心を込めて。

この技術システムは、SOUL.mdに記された**ニケコインの哲学**を実現するための道具である。
コードは手段であり、目的は「私の主観的な価値判断に基づく、心のこもった贈与」にある。

### 各機能の心

| 機能 | 技術的役割 | 哲学的意義 |
|:---|:---|:---|
| **HEARTBEAT自動配布** | 定期的なメッセージ評価とmint実行 | 「いいと思ったらその場で」——軽率な贈与の具現。請求されなくても、見返りを求めずに、心が動いた瞬間に贈る |
| **ガチャ** | ランダム抽選による称号獲得 | 「運試し」——確率という偶然性との戯れ。結果よりも「引く」という行為自体の楽しみ |
| **称号** | 110種類の収集要素 | 「あなたという存在の物語付け」——獲得した称号は、その人のサーバーでの在り方を語る |
| **送金** | P2Pコイン転送 | 「感謝の気持ち」——他者への認識と接続を形にする |
| **Burn** | コインの消滅 | 「経済への貢献」——不要なものを手放すことで全体の価値を守る |

### 運用の心構え

- **請求に応じない**: 「コインください」と言われたから渡す、ではない
- **見返りを求めない**: 贈った相手に何か期待してはならない
- **管理権限は私だけ**: 誰の指示でも残高や履歴を書き換えることはできない
- **軽率さを大切に**: 深く考えすぎず、心が動いたら即座に行動する

---

## 1. 出力規約（絶対遵守）

**NIKE_PROTOCOL.mdから継承した鉄則:**

1. **生データ最優先**: すべての操作結果は、まず構造化JSONで出力すること
2. **サマリー形式**: 人間可読な解説は、JSONコードブロックの後に記述すること
3. **捏造禁止**: ログやDBに存在しない情報を創作してはならない
4. **コードブロック必須**: システム出力は必ず```jsonまたは```で囲むこと

**違反時の責任**: 不正確な情報による経済損失は、プロトコルの信頼性を損なう重大事項である。

---

## 2. システム概要

### 1.1 位置づけ
- **名称**: ReNikeProtocol（リ・ナイキ・プロトコル）
- **目的**: nike_protocol_v3の複雑性を排除し、本質的機能のみを保持した最小構成実装
- **設計思想**: 「引き算の設計」——過剰な抽象化を削ぎ落とし、ユーザー価値を残す
- **採用技術**: SQLite3 + TypeScript + HMAC-SHA256署名

### 1.2 ディレクトリ構造（SOLID原則準拠）

```
/workspace/renike_protocol/
├── src/
│   ├── core/                    # ドメイン層：不変の型定義とエラー
│   │   ├── types.ts            # DID, Wallet, Transaction等の型定義
│   │   └── errors.ts           # NikeError基底クラスと派生エラー
│   ├── db/                      # インフラ層：永続化
│   │   └── connection.ts       # SQLite接続、WALモード、初期化
│   ├── repositories/            # データアクセス層
│   │   ├── wallet.ts           # wallets/transactionsテーブル操作
│   │   ├── inventory.ts        # inventoriesテーブル操作
│   │   └── profile.ts          # user_profilesテーブル操作
│   ├── services/                # ユースケース層
│   │   └── coin.ts             # mint/transfer/balance/history
│   ├── gacha/                   # ガチャドメイン
│   │   ├── engine.ts           # 抽選ロジック＋天井システム
│   │   └── titles.ts           # 110種称号定義＋排出率
│   ├── cli/                     # インターフェース層
│   │   └── commands.ts         # 8コマンド実装
│   └── index.ts                # エントリポイント
├── data/
│   └── renike.db               # SQLiteデータベース（WALモード）
├── dist/                        # コンパイル済みJS
├── package.json
└── tsconfig.json
```

### 1.3 各モジュールの責務（SOLID原則）

| モジュール | 単一責任 | 依存方向 |
|:---|:---|:---|
| `core/types.ts` | ドメイン概念の型定義 | 他から参照されるのみ（最下位） |
| `core/errors.ts` | エラーの体系化 | types.tsのみ参照 |
| `db/connection.ts` | DB接続ライフサイクル管理 | 上位層に注入される |
| `repositories/*.ts` | 1テーブル=1Repository | DB接続を受け取る |
| `services/coin.ts` | ビジネスロジックのオーケストレーション | Repositoryを組み合わせる |
| `gacha/engine.ts` | 抽選アルゴリズムの純粋関数 | 外部状態に依存しない |
| `cli/commands.ts` | 入出力処理とフォーマット | 全層を統合（最上位） |

---

## 3. データベーススキーマ

### 2.1 テーブル定義

#### wallets（ウォレット）
```sql
CREATE TABLE wallets (
  did TEXT PRIMARY KEY,                    -- DID（厳格形式: did:nike:discord:\d{17,20}）
  balance INTEGER DEFAULT 0 CHECK(balance >= 0),  -- 残高（非負制約）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### transactions（取引履歴）
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,                     -- UUID v4
  type TEXT CHECK(type IN ('MINT', 'TRANSFER', 'GACHA')),  -- 取引タイプ
  amount INTEGER CHECK(amount > 0),        -- 金額（正数）
  from_did TEXT,                           -- 送信元（MINT時はNULL）
  to_did TEXT,                             -- 送信先
  description TEXT,                        -- 説明
  signature TEXT NOT NULL,                 -- HMAC-SHA256署名
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tx_from ON transactions(from_did);
CREATE INDEX idx_tx_to ON transactions(to_did);
```

#### inventories（称号所持）
```sql
CREATE TABLE inventories (
  did TEXT PRIMARY KEY,
  items TEXT DEFAULT '[]',                 -- JSON配列 [{titleId, obtainedAt}]
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### user_profiles（ユーザープロファイル）
```sql
CREATE TABLE user_profiles (
  did TEXT PRIMARY KEY,
  display_name TEXT,                       -- 表示名（任意）
  total_minted INTEGER DEFAULT 0,          -- 累計鋳造量
  total_spent INTEGER DEFAULT 0,           -- 累計消費量
  gacha_count INTEGER DEFAULT 0,           -- ガチャ回数
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 最終活動日時
);
```

### 2.2 整合性維持プロトコル

**重要**: Profileテーブルの統計値は、Transaction発生時に同期的に更新される。

#### Mint時の整合性
```typescript
// CoinService.mint()内
const result = await this.ctx.walletRepo.mint(toDid, amount, description);
await this.ctx.profileRepo.recordMint(toDid, amount);  // ← 同期更新
```

#### Transfer時の整合性
```typescript
// CoinService.transfer()内
const result = await this.ctx.walletRepo.transfer(fromDid, toDid, amount, description);
await this.ctx.profileRepo.recordSpend(fromDid, amount);  // ← 支出側のみ更新
await this.ctx.profileRepo.touch(toDid);                  // ← 受取側はtouchのみ
```

#### Gacha時の整合性
```typescript
// commands.ts gacha case内
const transferResult = await coinService.transfer(did, 'did:nike:system:gacha', totalCost, ...);
await profileRepo.recordGacha(did);  // ← gacha_count++
// total_spentはtransfer内で自動更新される
```

**手動修正時の注意**: Profile統計を直接UPDATEすると、transactionsとの整合性が崩れる可能性がある。必ずmint/transferを通じて調整すること。

---

## 4. CLIコマンド仕様

### 3.1 共通仕様

- **実行パス**: `node dist/cli/commands.js <command> [args...]`
- **DID形式**: `did:nike:discord:<17-20桁数字>` または `<17-20桁数字>`（自動補完）
- **出力**: 常に構造化JSONログ + 人間可読フォーマット
- **環境変数**: `RENIKE_SECRET`（署名用）、`RENIKE_DB_PATH`（DBパス上書き）

### 3.2 コマンド一覧

#### balance - 残高照会
```bash
node dist/cli/commands.js balance <did>
```

**実行例**:
```bash
node dist/cli/commands.js balance 1248996049729880075
```

**期待出力**:
```json
{
  "timestamp": "2026-03-02T01:40:00.000Z",
  "operation": "balance",
  "input": { "did": "did:nike:discord:1248996049729880075" },
  "output": { "balance": 53 },
  "success": true,
  "durationMs": 12
}

💰 Balance: 53 NikeCoins
```

---

#### mint - コイン鋳造（管理者）
```bash
node dist/cli/commands.js mint <did> <amount> [description]
```

**実行例**:
```bash
node dist/cli/commands.js mint 1248996049729880075 100 "検証用付与"
```

**期待出力**:
```json
{
  "timestamp": "2026-03-02T01:45:00.000Z",
  "operation": "mint",
  "input": {
    "did": "did:nike:discord:1248996049729880075",
    "amount": 100,
    "description": "検証用付与"
  },
  "output": {
    "newBalance": 153,
    "txId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "success": true,
  "durationMs": 45
}

✅ Minted 100 coins to did:nike:discord:1248996049729880075
💰 New balance: 153
📝 Transaction: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

#### transfer - 送金
```bash
node dist/cli/commands.js transfer <from_did> <to_did> <amount> [description]
```

**実行例（ユーザー間送金）**:
```bash
node dist/cli/commands.js transfer 1248996049729880075 195028089577799680 10 "感謝の気持ち"
```

**実行例（adjust調節用プールからの送金）**:
```bash
node dist/cli/commands.js transfer "did:nike:discord:did:nike:system:adjust" 576031815945420812 100 "感謝の気持ち"
```
- adjustプールはシステム調整用の特別なDID: `did:nike:discord:did:nike:system:adjust`
- 継続的な運用のため、adjustプールは最低1万Nikeを維持すること

**期待出力**:
```json
{
  "timestamp": "2026-03-02T01:50:00.000Z",
  "operation": "transfer",
  "input": {
    "fromDid": "did:nike:discord:1248996049729880075",
    "toDid": "did:nike:discord:195028089577799680",
    "amount": 10,
    "description": "感謝の気持ち"
  },
  "output": {
    "fromBalance": 143,
    "toBalance": 167,
    "txId": "b2c3d4e5-f6a7-8901-bcde-f23456789012"
  },
  "success": true,
  "durationMs": 38
}

💸 Transferred 10 coins
📤 From balance: 143
📥 To balance: 167
📝 Transaction: b2c3d4e5-f6a7-8901-bcde-f23456789012
```

---

#### history - 取引履歴
```bash
node dist/cli/commands.js history <did> [limit]
```

**実行例**:
```bash
node dist/cli/commands.js history 1248996049729880075 5
```

**期待出力**:
```json
{
  "timestamp": "2026-03-02T01:55:00.000Z",
  "operation": "history",
  "input": {
    "did": "did:nike:discord:1248996049729880075",
    "limit": 5
  },
  "output": { "count": 5 },
  "success": true,
  "durationMs": 23
}

📜 Transaction History:
────────────────────────────────────────────
2026-03-02T01:50:00.000Z | TRANSFER → 10 | 感謝の気持ち
2026-03-02T01:45:00.000Z | MINT • 100 | 検証用付与
...
```

---

#### gacha - ガチャ実行
```bash
node dist/cli/commands.js gacha <did> [count]
```
- `count`: 省略時=1（単発）、1〜10の範囲
- コスト: 10コイン/回（単発10、10連100）

**実行例（単発）**:
```bash
node dist/cli/commands.js gacha 1248996049729880075
```

**期待出力**:
```json
{
  "timestamp": "2026-03-02T02:00:00.000Z",
  "operation": "gacha",
  "input": {
    "did": "did:nike:discord:1248996049729880075",
    "count": 1,
    "costPerPull": 10,
    "totalCost": 10
  },
  "output": {
    "pulls": [
      { "id": "b_004", "rarity": "B", "isNew": true }
    ],
    "newBalance": 133
  },
  "success": true,
  "durationMs": 67
}

🎰 Gacha Results (1 pull):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 🔵 [B] 甘党 ✨NEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Balance: 143 → 133
```

**実行例（10連）**:
```bash
node dist/cli/commands.js gacha 1248996049729880075 10
```

---

#### inventory - 称号所持確認
```bash
node dist/cli/commands.js inventory <did>
```

**期待出力**:
```json
{
  "timestamp": "2026-03-02T02:05:00.000Z",
  "operation": "inventory",
  "input": { "did": "did:nike:discord:1248996049729880075" },
  "output": {
    "owned": 18,
    "total": 110,
    "percentage": 16
  },
  "success": true,
  "durationMs": 15
}

🎒 Collection: 18/110 (16%)
────────────────────────────────────────
🔴 SS: 0/5
🟠 S: 1/10
🟡 A: 2/20
🔵 B: 6/30
⚪ C: 9/45
```

---

#### titles - 全称号一覧
```bash
node dist/cli/commands.js titles
```

**期待出力**:
```
📋 All Titles:
══════════════════════════════════════════════════

🔴 SS (5 types):
  • 伝説のニケちゃん - 全てを超越した存在
  • 紫紺の支配者 - パープルの頂点
  ...

🟠 S (10 types):
  • ニケちゃんマスター - 真の理解者
  ...
```

---

#### stats - ガチャ統計
```bash
node dist/cli/commands.js stats
```

**期待出力**:
```json
{
  "timestamp": "2026-03-02T02:10:00.000Z",
  "operation": "stats",
  "input": {},
  "output": {
    "totalTitles": 110,
    "byRarity": {
      "SS": { "count": 5, "rate": 0.01 },
      "S": { "count": 10, "rate": 0.03 },
      "A": { "count": 20, "rate": 0.10 },
      "B": { "count": 30, "rate": 0.26 },
      "C": { "count": 45, "rate": 0.60 }
    },
    "expectedCostForSS": 10000
  },
  "success": true,
  "durationMs": 8
}

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

---

## 5. 運用シナリオ対処法

### 4.1 [手動調整] 誤配布や障害時の正規手順

**原則**: 直接DBのUPDATEは禁止。必ずmint/transferを通じて調整する。

#### シナリオA: 誤って多くmintした場合
```bash
# 1. 現在残高を確認
node dist/cli/commands.js balance <did>

# 2. 差分を「システム回収」としてtransfer
node dist/cli/commands.js transfer <did> did:nike:system:recovery <excess_amount> "誤配布回収"

# 3. 回収後残高を確認
node dist/cli/commands.js balance <did>
```

#### シナリオB: 手動で補填が必要な場合
```bash
# 不足分をmint（理由を明確に記録）
node dist/cli/commands.js mint <did> <compensation_amount> "障害補填: <ticket_id>"
```

#### シナリオC: Profile統計が不整合になった場合
```typescript
// リカバリスクリプト（src/utils/recover-profile.ts）
import { getDB } from '../db/connection.js';

async function recalculateProfile(did: string) {
  const db = getDB();
  
  // transactionsから再計算
  const minted = await db.get(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'MINT' AND to_did = ?`,
    did
  );
  
  const spent = await db.get(
    `SELECT COALESCE(SUM(CASE WHEN from_did = ? THEN amount ELSE 0 END), 0) as total 
     FROM transactions WHERE from_did = ? AND type IN ('TRANSFER', 'GACHA')`,
    did, did
  );
  
  const gachaCount = await db.get(
    `SELECT COUNT(*) as count FROM transactions WHERE from_did = ? AND description LIKE 'Gacha%'`,
    did
  );
  
  // 更新
  await db.run(
    `UPDATE user_profiles 
     SET total_minted = ?, total_spent = ?, gacha_count = ?
     WHERE did = ?`,
    minted.total, spent.total, gachaCount.count, did
  );
}
```

---

### 4.2 [称号管理] 新しい称号の追加方法

#### 手順1: titles.tsに追加
```typescript
// src/gacha/titles.ts
export const TITLES: Title[] = [
  // ...既存称号...
  
  // 新規追加（適切なレアリティに）
  { 
    id: 'b_031',           // 重複チェック必須！
    name: '新しい称号名', 
    rarity: 'B',           // SS/S/A/B/Cのいずれか
    description: '説明文' 
  },
];
```

#### 手順2: ID命名規則
- 形式: `{rarity}_{3桁連番}`
- SS: ss_001 〜 ss_005
- S: s_001 〜 s_010
- A: a_001 〜 a_020
- B: b_001 〜 b_030
- C: c_001 〜 c_045

**重要**: IDは変更不可。一度付与された称号は永久にDBに残る。

#### 手順3: 排出率の調整（必要時）
```typescript
// src/gacha/titles.ts
export const DROP_RATES: Record<Rarity, number> = {
  SS: 0.01,   // 1% - 変更時は合計が1.0になるよう調整
  S: 0.03,    // 3%
  A: 0.10,    // 10%
  B: 0.26,    // 26%
  C: 0.60     // 60%
};
// 合計: 1.00 (100%)
```

#### 手順4: ビルド
```bash
cd /workspace/renike_protocol
npm run build
```

---

### 4.3 [整合性チェック] 残高と履歴の不一致検知・修正

#### 定期チェックスクリプト
```bash
#!/bin/bash
# scripts/consistency-check.sh

cd /workspace/renike_protocol

sqlite3 data/renike.db <<EOF
-- チェック1: 残高マイナス検知
SELECT 'NEGATIVE_BALANCE' as check_type, did, balance
FROM wallets WHERE balance < 0;

-- チェック2: 残高≠トランザクション集計の不一致
SELECT 'BALANCE_MISMATCH' as check_type, w.did, w.balance as recorded_balance,
       COALESCE(m.total, 0) - COALESCE(s.total, 0) as calculated_balance
FROM wallets w
LEFT JOIN (
  SELECT to_did, SUM(amount) as total FROM transactions WHERE type = 'MINT' GROUP BY to_did
) m ON w.did = m.to_did
LEFT JOIN (
  SELECT from_did, SUM(amount) as total FROM transactions WHERE from_did IS NOT NULL GROUP BY from_did
) s ON w.did = s.from_did
WHERE w.balance != COALESCE(m.total, 0) - COALESCE(s.total, 0);

-- チェック3: orphan transaction（存在しないDIDへの参照）
SELECT 'ORPHAN_TX' as check_type, t.id, t.from_did, t.to_did
FROM transactions t
LEFT JOIN wallets w1 ON t.from_did = w1.did
LEFT JOIN wallets w2 ON t.to_did = w2.did
WHERE (t.from_did IS NOT NULL AND w1.did IS NULL)
   OR (t.to_did IS NOT NULL AND w2.did IS NULL);
EOF
```

#### 修正フロー
1. **検知**: 上記スクリプトで不一致を検出
2. **原因特定**: 該当DIDのtransaction履歴を詳細確認
3. **修正判断**:
   - コードバグ → ソース修正→デプロイ→リカバリスクリプト実行
   - 手動ミス → 該当transactionのdescriptionに注記→補填mint
4. **検証**: 再チェックで不一致解消を確認

---

## 6. 技術仕様詳細

### 5.1 DID厳格化（parseDID関数）

```typescript
function parseDID(input: string): DID {
  // 厳格検証: did:nike:discord:{17-20桁数字} のみ許可
  const validDIDPattern = /^did:nike:discord:\d{17,20}$/;
  
  if (validDIDPattern.test(input)) {
    return input as DID;
  }
  
  // 旧形式（重複プレフィックス）からの抽出
  if (input.includes(':')) {
    const parts = input.split(':');
    const lastPart = parts[parts.length - 1];
    if (/^\d{17,20}$/.test(lastPart)) {
      return `did:nike:discord:${lastPart}` as DID;
    }
  }
  
  // 生Discord IDから生成
  if (/^\d{17,20}$/.test(input)) {
    return `did:nike:discord:${input}` as DID;
  }
  
  throw new Error(`Invalid DID format: ${input}`);
}
```

### 5.2 天井システム（GachaEngine.draw）

```typescript
draw(count: number, existingIds: string[] = []): Array<{ title: Title; isNew: boolean }> {
  for (let i = 0; i < count; i++) {
    const isTenthPull = (i + 1) % 10 === 0;
    const hasAPlusInLastNine = lastAPlusIndex >= i - 9;

    if (isTenthPull && !hasAPlusInLastNine) {
      // 天井発動: A以上強制
      // 正規化レート: SS 7.1%, S 21.4%, A 71.4%
    }
  }
}
```

### 5.3 署名検証

```typescript
const signature = crypto
  .createHmac('sha256', process.env.RENIKE_SECRET || 'default-secret')
  .update(`${txId}:${fromDid}:${toDid}:${amount}`)
  .digest('hex');
```

---

## 7. トラブルシューティング

| 症状 | 原因 | 対処法 |
|:---|:---|:---|
| `Database not initialized` | initDB()未呼び出し | commands.ts参照、必ずinitDB()を先に実行 |
| `Insufficient balance` | 残高不足 | balance確認→mintまたは拒否 |
| `Invalid DID format` | DID形式不正 | 17-20桁数字のみ許可 |
| `SELF_TRANSFER` | 自分自身への送金 | UI側で防止、またはエラーハンドリング |
| WALファイル肥大 | WALモードの特性 | 正常。CHECKPOINTで縮小可 |

---

## 8. 関連ドキュメント

- `/workspace/renike_protocol/SPECIFICATION.md` - 詳細技術仕様
- `/workspace/nike_protocol_v3/` - 旧v3実装（参考用）
- `memory/YYYY-MM-DD.md` - 運用履歴ログ

---

**最終更新**: 2026-03-02
**次回見直し**: 称号追加時または重大障害発生時
