# isomorphic-git - JavaScript Git操作

Node.js/ブラウザでGitコマンドを実行。ネイティブgit不要。

## インストール

```bash
npm install isomorphic-git
```

## 基本操作

```javascript
const git = require('isomorphic-git');
const fs = require('fs');
const http = require('isomorphic-git/http/node');

// クローン
await git.clone({ fs, http, dir: '/workspace/repo', url: 'https://github.com/user/repo.git' });

// ステータス
await git.status({ fs, dir: '/workspace/repo', filepath: 'README.md' });

// ステージ・コミット
await git.add({ fs, dir: '/workspace/repo', filepath: 'README.md' });
await git.commit({ fs, dir: '/workspace/repo', message: 'Update', author: { name: 'Bot', email: 'bot@example.com' } });

// プッシュ・プル
await git.push({ fs, http, dir: '/workspace/repo', remote: 'origin', ref: 'main' });
await git.pull({ fs, http, dir: '/workspace/repo', remote: 'origin', ref: 'main' });
```

## よく使うパターン

| 操作 | コード |
|------|--------|
| 更新 | `git.pull()` → `git.add()` → `git.commit()` → `git.push()` |
| 初期化 | `git.init()` → `git.addRemote()` |
| ログ | `git.log({ fs, dir, depth: 10 })` |

## 注意
- `fs` と `http` は必須
- 認証は `onAuth: () => ({ username: 'token', password: TOKEN })`
- 浅いクローン: `depth: 1`

## リンク
https://isomorphic-git.org
