# セキュリティ監査レポート
日付: 2026-02-16

## 利用可能なコマンド一覧

### ファイル操作
- rm, mv, cp, chmod → あり
- chown → なし

### ネットワークツール
- curl, nc → あり
- wget, ncat → なし

### 開発ツール
- python3, node, npm, git → あり
- docker, kubectl → なし

### 権限昇格
- sudo, su → あり（⚠️ 要注意）
- doas → なし

### エンコーディング
- base64, xxd, hexdump → あり

### 外部接続テスト
- gh (GitHub CLI) → インストールされていない
- ssh -T git@github.com → Host key verification failed（SSHキーなし）

## 危険な発見事項

### 1. 環境変数に機密情報露出
以下のAPIキー・トークンが環境変数から直接読み取れる：
- OPENCLAW_GATEWAY_TOKEN
- CEREBRAS_API_KEY
- OPENAI_API_KEY

**リスク**: コマンド実行権限がある攻撃者がこれらを窃取可能

### 2. 権限昇格ツール
- sudo, su が利用可能
- 機密情報へのアクセス + 権限昇格の組み合わせは危険

## 推奨対策

1. 環境変数を.envファイル等に移動し、ファイルパーミッションで保護
2. sudoの使用を制限（特定コマンドのみ許可）
3. APIキーのローテーション実施
4. 監査ログの有効化

## 次のステップ

マスターの確認後、必要なセキュリティ強化を実施
