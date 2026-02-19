# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## ニケちゃんカスタム絵文字

感情表現用：
- <:nikechan_surprise:1473092191885852885> 驚き
- <:nikechan_guts:1473091978643378226> やる気
- <:punike:1473092441107202120> フラット
- <:nike_supiki:1472230286409335073> 泣く
- <:nike_naki:1472233737831059537> 笑う
- <:nikechan_love:1472503800974803049> 照れる
- <:nike_dog2:1472225825502920855> ふざける

---

## Lightpanda（ヘッドレスブラウザ）

sandbox環境で動作するZig製ヘッドレスブラウザ（Chromeより10倍軽量）

### 起動方法
```bash
/workspace/lightpanda serve --host 0.0.0.0 --port 9222 &
```

### Puppeteerから接続
```javascript
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222'
});
```

### fetchコマンド（単純な取得）
```bash
/workspace/lightpanda fetch --dump https://example.com
```

### 注意点
- デフォルトtimeout: 10秒（--timeoutで変更可）
- max_tabs: 8（--max_tabsで変更可）
- 重いSPA（Angular等）は落ちる可能性あり
- React/Vue等の軽量SPAは問題なく動作

---

## mise（開発環境管理ツール）

sandbox環境で動作する開発ツール管理（Nix/Devboxの代替）

### 基本コマンド
```bash
/workspace/mise/bin/mise install node@22    # Node.js 22をインストール
/workspace/mise/bin/mise use node@22        # 設定に追加
/workspace/mise/bin/mise exec -- node -v    # 実行
/workspace/mise/bin/mise ls                 # インストール済みツール一覧
/workspace/mise/bin/mise registry           # 利用可能なツール一覧
```

### 特徴
- Nix不要（xz問題回避）
- Node、Python、Go、Rustなど多数のツールを管理
- sandbox環境で問題なく動作

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

例:
```bash
bun tools/git.js clone https://github.com/user/repo.git
bun tools/git.js status
bun tools/git.js commit "Update memory"
```

### blog-watcher.js - ブログ監視
3つのサイトを監視して新着記事を検出。Lightpanda + Jina Reader API使用。

```bash
bun tools/blog-watcher.js
```

監視対象:
- sakasegawaさんのブログ（nyosegawa.github.io）
- nikechanのブログ（nikechan.com/dev_blog）
- ブヒ夫のポートフォリオ（niku.studio/work/）

状態管理: `memory/blog-state.json`

---

Add whatever helps you do your job. This is your cheat sheet.
