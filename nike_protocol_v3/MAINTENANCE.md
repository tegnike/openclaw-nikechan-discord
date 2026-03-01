# Nike Protocol v3 - メンテナンスガイド

## 概要

このガイドは、Nike Protocol v3の移行後の運用・保守について説明します。

---

## ディレクトリ構造

```
~/.nike/
├── coin_v3.db.enc          # v3メインデータベース（AES-256-GCM暗号化）
├── coin_v2.db.enc.migrated # 移行済み旧DB（バックアップとして保持）
└── backups/
    └── pre_migration_*     # 移行前の自動バックアップ
```

---

## 日常コマンド

### データベース状態確認

```bash
nike-cli status
```

出力例:
```
📊 データベース状態:

  v2 DB: ~/.nike/coin_v2.db.enc.migrated (アーカイブ済み)
  v3 DB: ~/.nike/coin_v3.db.enc (アクティブ)
  バックアップ: ~/.nike/backups/
    - pre_migration_2024-03-01T08-30-00Z
```

### 整合性検証

```bash
nike-cli verify
```

---

## 称号追加手順

### 1. 新しい称号を定義

`src/core/domain/gacha/DropTable.ts` を編集:

```typescript
// 例: Sレアリティに新称号を追加
const sTitles = [
  // ... 既存の称号 ...
  ['s011', '新しい称号名', '称号の説明文'],
];
```

### 2. ID命名規則

| レアリティ | ID形式 | 例 |
|-----------|--------|-----|
| SS | `ssXXX` | ss001 |
| S | `sXXX` | s011 |
| A | `aXXX` | a021 |
| B | `bXXX` | b031 |
| C | `cXXX` | c046 |

**重要**: IDは重複不可、連番推奨

### 3. 確率変更時の注意

```typescript
private static readonly rates: Map<Rarity, number> = new Map([
  [Rarity.SS, 0.01],   // 変更時は合計が100%になるよう調整
  [Rarity.S, 0.03],
  [Rarity.A, 0.10],
  [Rarity.B, 0.26],
  [Rarity.C, 0.60]     // 60% (残りをCで埋める)
]);
```

**必須チェック**: 全レアリティの合計確率 = 1.0 (100%)

### 4. デプロイ

```bash
npm run build
npm test  # 統計的テストもパスすることを確認
```

---

## トラブルシューティング

### データベース破損時

```bash
# 1. バックアップから復元
mv ~/.nike/coin_v3.db.enc ~/.nike/coin_v3.db.enc.corrupted
cp ~/.nike/backups/pre_migration_*/coin_v2.db.enc ~/.nike/coin_v2.db.enc

# 2. 再移行
nike-cli migrate
```

### 暗号化キー紛失時

**⚠️ 警告**: キーがないとデータは復元不可能です

対応策:
1. バックアップからキーを探す
2. 環境変数 `NIKE_COIN_ENCRYPTION_KEY` を確認
3. それでも無理な場合はデータ消失を受け入れる

### パフォーマンス低下時

```bash
# ログ確認
tail -f ~/.nike/logs/migration.log

# データベース最適化（将来的な機能）
nike-cli optimize
```

---

## 拡張ガイド

### 新しいドメインエンティティの追加

1. **Value Object作成**
   ```typescript
   // src/core/domain/newfeature/NewEntity.ts
   export class NewEntity {
     // 不変性を保つ
     // validationを含む
     // neverthrow Result型を返す
   }
   ```

2. **Repository Interface定義**
   ```typescript
   // src/core/interfaces/repositories/INewRepository.ts
   export interface INewRepository {
     findById(id: string): Promise<Result<NewEntity, Error>>;
     save(entity: NewEntity): Promise<Result<void, Error>>;
   }
   ```

3. **Infrastructure実装**
   ```typescript
   // src/infrastructure/persistence/NewRepository.ts
   export class NewRepository implements INewRepository {
     // SQLite/Better-sqlite3実装
   }
   ```

### イベント駆動拡張

```typescript
// src/core/events/DomainEvent.ts
export interface DomainEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

// 使用例
const event: DomainEvent = {
  type: 'CoinTransferred',
  payload: { from, to, amount },
  timestamp: new Date()
};
```

---

## セキュリティチェックリスト

- [ ] 暗号化キーは環境変数のみで管理
- [ ] キーは定期的にローテーション
- [ ] バックアップは暗号化されたまま保存
- [ ] アクセスログを監査
- [ ] 異常検知アラートを設定

---

## 連絡先・サポート

問題が発生した場合:
1. ログファイルを確認: `~/.nike/logs/`
2. バックアップを確認: `~/.nike/backups/`
3. 開発者に連絡

---

*最終更新: 2024-03-01*
*バージョン: v3.0.0*
