# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Sandbox 環境

- **Docker イメージ:** `openclaw-sandbox:custom`
- **ワークスペースパス:** `/Users/nikenike/.openclaw/workspace-nikechan-discord/`
- **パス注意:** `~` や `$HOME` は `/root` に解決される。絶対パスか相対パスを使うこと

### 利用可能なツール
- **HTTP取得:** `bun tools/fetch.js <URL> [-o file] [-b]`（curl は使えない）
- **Git操作:** `bun tools/git.js <command> [args]`（isomorphic-git、sandbox対応）
- **ブラウザ:** `/workspace/lightpanda`（Zig製ヘッドレスブラウザ）
- **ランタイム管理:** `/workspace/mise/bin/mise`（bun, node 等）

## 監視対象ブログ

- sakasegawaブログ: https://nyosegawa.github.io/
- ブヒ夫ポートフォリオ: https://niku.studio/work/
- 花音公式サイト: https://kanon.0235.co.jp/

## モデル設定

- **プライマリモデル:** `bailian/kimi-k2.5`
- **画像モデル:** `google/gemini-2.5-flash`
