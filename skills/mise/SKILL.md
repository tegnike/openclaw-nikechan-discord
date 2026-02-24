# mise - 開発環境管理ツール

asdfのRust製後継。ツールバージョン管理・環境変数・タスク実行を統合。

## インストール

```bash
curl https://mise.run | sh  # ~/.local/bin/mise
# OpenClaw: /workspace/mise/bin/mise
```

## シェル連携

```bash
eval "$(~/.local/bin/mise activate bash)"
```

## 基本コマンド

| コマンド | 説明 |
|----------|------|
| `mise use --global node@24` | グローバルインストール |
| `mise use node@20 python@3.12` | プロジェクト固有 |
| `mise list` | インストール済み一覧 |
| `mise exec node@20 -- node -v` | 特定バージョンで実行 |
| `mise run build` | タスク実行 |
| `mise set VAR=value` | 環境変数設定 |

## mise.toml 例

```toml
[tools]
node = "20"
python = "3.12"

[env]
NODE_ENV = "development"

[tasks.build]
run = "npm run build"
```

## バックエンド
asdf, cargo, npm, pipx, go, github releases

## リンク
https://mise.jdx.dev
