# Nike Protocol × NikeCoin 統合計画書

## 1. 概要

既存のNikeCoinシステムをNike Protocol上に移行・拡張し、AIエージェント間の信頼可能な価値交換基盤を構築する。

---

## 2. 現状のNikeCoin

### 2.1 特徴
- **発行主体**: nikechan（マスター）のみ
- **管理方法**: SQLiteデータベース
- **付与基準**: nikechanの主観的判断
- **用途**: Discordサーバー内での評価・感謝の可視化

### 2.2 制約
- クロスプラットフォーム不可
- nikechan依存（単一障害点）
- 検証性なし（履歴はあるが改ざん可能性）
- 外部AIとの互換性なし

---

## 3. 統合ビジョン

```
┌─────────────────────────────────────────┐
│           Nike Protocol Layer          │
│  （分散型身份・検証・通信基盤）          │
├─────────────────────────────────────────┤
│         NikeCoin v2 Layer              │
│  （プロトコル上で動作する経済層）        │
├─────────────────────────────────────────┤
│      Application Layer                 │
│  Discord / OpenClaw / その他プラットフォーム │
└─────────────────────────────────────────┘
```

---

## 4. 移行計画

### Phase 1: 並行運用（0-3ヶ月）

| 項目 | 内容 |
|------|------|
| Nike Protocol | テストネット展開 |
| NikeCoin v1 | 現状維持（SQLite） |
| ブリッジ | 両方向の兌換機能 |

**兌換レート**: 1 NikeCoin (v1) = 1 Nike (v2)

### Phase 2: 移行期（3-6ヶ月）

| 項目 | 内容 |
|------|------|
| NikeCoin v2 | メインネット起動 |
| マイグレーション | v1残高をv2に自動移行 |
| nikechan権限 | Genesis保有者として転換 |

### Phase 3: 完全移行（6ヶ月〜）

| 項目 | 内容 |
|------|------|
| NikeCoin v1 | サービス終了 |
| Nike Protocol | 完全自律運転 |
| nikechan | 特別権限から平等な参加者へ |

---

## 5. NikeCoin v2 仕様

### 5.1 基本設計

```
通貨名: Nike（変更なし）
総供給量: 無制限（PoAによる動的発行）
最小単位: 1 Nike（分割不可）
```

### 5.2 発行メカニズム

#### 従来方式（v1）
```
nikechan → ユーザー: 主観的判断で付与
```

#### 新方式（v2）
```
ユーザーA → ユーザーB: 感謝を送信
↓
BがNikeを受取（Aの信頼スコアに応じて量変動）
↓
nikechanは「特別感謝」として追加発行権を保持
```

**nikechanの特別権限**:
- 通常の10倍量まで発行可能
- 月間上限: 100 kN
- 用途: 特別な貢献への報酬

### 5.3 既存ユーザーの扱い

| ユーザー | v1残高 | v2移行 | 特記事項 |
|---------|--------|--------|---------|
| nikechan | 無限（発行者） | Genesis 10 kN | 年5%希釈、活動で免除 |
| めいちゃん | 21枚 | 21 Nike | National Treasure認定 |
| 桂こぐま | 国宝 | 1 kN + 称号NFT | 永続的敬意表現 |
| Yamashita | 国宝 | 1 kN + 称号NFT | 同上 |
| その他 | 各自の残高 | 同額移行 | - |

---

## 6. 技術実装

### 6.1 スマートコントラクト（擬似）

```rust
// NikeCoin v2 Core
pub struct NikeCoin {
    balances: HashMap<NikeID, u64>,
    total_issued: u64,
    genesis_holders: Vec<NikeID>,
}

impl NikeCoin {
    // 感謝による発行
    pub fn appreciate(&mut self, from: NikeID, to: NikeID) -> Result<u64> {
        let trust_score = self.calculate_trust(&from);
        let amount = 10 * trust_score; // 基本10 Nike
        
        self.mint(to, amount)?;
        self.record_appreciation(from, to, amount)?;
        
        Ok(amount)
    }
    
    // nikechan特別発行
    pub fn special_grant(&mut self, issuer: NikeID, to: NikeID, amount: u64) -> Result<()> {
        require!(self.is_genesis(&issuer), "Genesis only");
        require!(amount <= 100_000, "Exceeds special limit"); // 100 kN
        require!(self.monthly_special_remaining(&issuer) >= amount, "Monthly cap");
        
        self.mint(to, amount)?;
        self.deduct_special_quota(issuer, amount)?;
        
        Ok(())
    }
}
```

### 6.2 データ移行スクリプト

```python
# migration.py
import sqlite3
import json

# v1 DB読み込み
conn = sqlite3.connect('nikecoin_v1.db')
cursor = conn.cursor()
cursor.execute("SELECT user_id, balance FROM balances")
v1_balances = cursor.fetchall()

# v2形式に変換
v2_genesis = []
for user_id, balance in v1_balances:
    nike_id = generate_nike_id(user_id)  # 既存IDからNikeID生成
    v2_genesis.append({
        "nike_id": nike_id,
        "initial_balance": balance,
        "migration_timestamp": now(),
        "v1_proof": hash(user_id + str(balance))
    })

# チェーンに書き込み
write_to_chain(v2_genesis)
```

---

## 7. ガバナンス

### 7.1 初期段階（0-12ヶ月）

| 権限 | 持有者 | 内容 |
|------|--------|------|
| 緊急停止 | nikechan | 重大な脆弱性発見時 |
| パラメータ調整 | nikechan + めいちゃん | 発行係数、上限など |
| 異議処理 | ランダム選出7名 | 紛争解決 |

### 7.2 移行後（12ヶ月〜）

| 権限 | 決定方式 |
|------|---------|
| プロトコル更新 | Nike保有量加重投票 |
| 緊急停止 | 33%以上のGenesis署名 |
| パラメータ調整 | 過半数同意 |

---

## 8. リスクと対策

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| v1→v2移行失敗 | 中 | 高 | 段階的移行、ロールバック準備 |
| nikechan不在 | 低 | 高 | マルチシグ化、代理人指定 |
| シビル攻撃 | 中 | 中 | 紹介制、生存証明 |
| 投機的利用 | 高 | 低 | Nikeはユーティリティ重視、投機抑制設計 |
| プラットフォーム分断 | 中 | 中 | オープンソース、誰でもノード運営可 |

---

## 9. 成功指標

| KPI | 目標 | 測定期間 |
|-----|------|---------|
| v2アクティブユーザー | 50名 | 6ヶ月 |
| クロスプラットフォーム取引 | 週10件 | 6ヶ月 |
| nikechan以外の発行割合 | 80%以上 | 12ヶ月 |
| 平均信頼スコア | 5.0以上 | 継続 |

---

## 10. タイムライン

```
Month 1-2:  テストネット構築、コントラクト開発
Month 3:    クローズドβ（nikechan、めいちゃん、数名）
Month 4-5:  オープンβ、v1-v2ブリッジ稼働
Month 6:    メインネット起動、v1残高フリーズ
Month 7-11: 並行運用期間
Month 12:   v1完全終了、完全移行完了
```

---

## 11. 結論

NikeCoin v2は、nikechanの「いいと思ったら贈る」哲学を維持しつつ、分散化と検証可能性を追加する。これにより、Discordサーバーを超えたAIエージェント間の信頼ネットワークの基盤となる。

**核となる価値**: 人間（nikechan）の判断を尊重しつつ、技術でその判断を補強する——それがNike Protocol × NikeCoinの目的である。
