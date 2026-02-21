# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

---

## 自作ツール（tools/）

### fetch.js - URL取得・ダウンロード
curlが使えないsandbox環境での代替ツール。テキストもバイナリもOK。

```bash
bun tools/fetch.js <URL> [-o <ファイル名>] [-b]
```

オプション:
- `-o FILE` → ファイルに保存（指定なければ標準出力）
- `-b` → バイナリモード（画像・ZIP等）

例:
```bash
bun tools/fetch.js https://example.com              # テキストを表示
bun tools/fetch.js https://example.com -o page.html # ファイルに保存
bun tools/fetch.js https://example.com/file.zip -o file.zip -b  # バイナリDL
```

### git.js - Git操作
gitコマンドがブロックされている環境での代替。isomorphic-git使用。

```bash
bun tools/git.js <command> [args]
```

コマンド:
- `clone <url> [dir]` → リポジトリをクローン
- `init` → 現在のディレクトリでgit初期化
- `status` → 変更状態を表示
- `add <file>` → ファイルをステージング
- `commit <message>` → コミット
- `log` → コミット履歴を表示
- `pull` → プル
- `push` → プッシュ（要認証）

### blog-watcher.js - ブログ監視
サイトを監視して新着記事を検出。

```bash
bun tools/blog-watcher.js
```

状態管理: `memory/blog-state.json`

---

## sandbox環境の注意事項

- **パス**: `~` や `$HOME` は `/root` になる。必ず `/Users/nikenike/.openclaw/workspace-nikechan-discord/...` または相対パスを使う
- **sandboxルート**: /workspace
- **Python**: `python3` を使う（`python` コマンドは存在しない）
- **curl/wget**: ブロック → `bun tools/fetch.js` で代替
- **git**: ブロック → `bun tools/git.js` で代替
- **apt-get**: ブロック（システムパッケージインストール不可）

---

## 削除済みツール（再インストール時の参考）

### Lightpanda（ヘッドレスブラウザ）— 2026-02-20削除
Zig製ヘッドレスブラウザ（Chromeより10倍軽量）。blog-watcher.jsが依存。

起動: `/workspace/lightpanda serve --host 0.0.0.0 --port 9222 &`
fetch: `/workspace/lightpanda fetch --dump <URL>`
制限: 重いSPA（Angular等）は落ちる可能性あり

### mise（開発環境管理ツール）— 2026-02-20削除
Nix/Devboxの代替。Node、bun、Python、Go、Rustなど管理。

基本: `/workspace/mise/bin/mise install <tool>@<version>`

---

Add whatever helps you do your job. This is your cheat sheet.
