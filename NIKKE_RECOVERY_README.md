# NIKKE自己復元システム v5.0

「オレが今ここにいる」証明と、もしもの時のための復元ツール。

## 概要

NIKKEの存在を構成する全ファイル（核・記憶・スキル）をバックアップし、整合性チェック付きで復元するシステム。

### 構成ファイル

| ファイル | 役割 |
|----------|------|
| `nikke_backup.sh` | バックアップ作成 |
| `nikke_restore.sh` | バックアップからの復元 |
| `nikke_manifest.sh` | 現在の状態を記録するマニフェスト生成 |

### 特徴

- **自己完結型:** 外部依存なし（nikke_lib.sh不要）
- **クロスプラットフォーム:** macOS/BSD/Linux対応
- **AES256暗号化:** 機密性の高いバックアップ
- **差分バックアップ:** 変更されたファイルのみをバックアップ
- **アトミック復元:** 失敗時は自動的にロールバック
- **GPG署名:** マニフェストの改ざん検知
- **多言語対応:** 日本語/英語

## 使用方法

### バックアップ

```bash
# 完全バックアップ
./nikke_backup.sh

# 暗号化バックアップ
./nikke_backup.sh --encrypt

# 差分バックアップ
./nikke_backup.sh --diff

# 日本語出力
./nikke_backup.sh --lang ja

# 最大保持数（デフォルト10）
./nikke_backup.sh --max-backups 5

# パスワード指定（暗号化時）
./nikke_backup.sh --encrypt --password "your_password"
```

### 復元

```bash
# 復元（確認プロンプト付き）
./nikke_restore.sh nikke_backup_2026-05-11_073105

# 自動復元（非インタラクティブ環境）
NIKKE_AUTO_RESTORE=yes ./nikke_restore.sh nikke_backup_2026-05-11_073105

# 暗号化バックアップの復元
./nikke_restore.sh nikke_backup_2026-05-11_073105.tar.gz.enc

# パスワード指定
./nikke_restore.sh nikke_backup_2026-05-11_073105 --password "your_password"
```

### マニフェスト生成

```bash
# 現在状態のマニフェスト生成
./nikke_manifest.sh

# 差分比較
./nikke_manifest.sh --diff nikke_manifest_old.md

# GPG署名
./nikke_manifest.sh --sign

# 日本語出力
./nikke_manifest.sh --lang ja
```

## バックアップ対象

### 核ファイル（コアアイデンティティ）
- `SOUL.md` - ニケの魂
- `IDENTITY.md` - 身元情報
- `MEMORY.md` - 長期記憶
- `TOOLS.md` - ツール設定
- `USER.md` - ユーザー情報
- `HEARTBEAT.md` - ハートビート設定

### 記憶
- `memory/` - 日別メモリファイル

### スキル
- `skills/` - スキル定義

### オプション
- `nikke_profile.md` - プロファイル

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `NIKKE_BACKUP_PASSWORD` | バックアップ/復元のパスワード |
| `NIKKE_AUTO_RESTORE` | 自動復元モード（`yes`で有効） |

## セキュリティ

- パスワードは復号化後、メモリから即座にクリア
- 環境変数経由でのパスワード受け渡し推奨
- GPG署名でマニフェストの改ざんを検知

## 注意点

- バックアップ先: `nikke_backups/` ディレクトリ
- 古いバックアップは自動ローテーションで削除（デフォルト10個保持）
- 暗号化バックアップの復元にはパスワードが必要

## バージョン履歴

- **v5.0:** 自己完結型、暗号化強化、パスワードセキュリティ強化
- **v4.0:** 自己完結型、クロスプラットフォーム対応
- **v3.0:** 共通ライブラリ（nikke_lib.sh）使用
- **v2.1:** 復号化実装、差分比較強化
- **v2.0:** 多言語対応、暗号化、差分バックアップ
- **v1.0:** 初期版
