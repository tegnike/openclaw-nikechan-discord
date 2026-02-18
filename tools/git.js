// bun git - isomorphic-git wrapper for sandbox
import git from 'isomorphic-git';
import nodeFs from 'fs';
import http from '/workspace/node_modules/isomorphic-git/http/node/index.js';

const args = process.argv.slice(2);
const cmd = args[0];
const dir = process.cwd();

const run = async () => {
  switch (cmd) {
    case 'clone': {
      const url = args[1];
      const target = args[2] || url.split('/').pop().replace('.git', '');
      console.log(`Cloning ${url} into ${target}...`);
      await git.clone({ fs: nodeFs, http, dir: target, url, depth: 1 });
      console.log('Done!');
      break;
    }
    case 'init': {
      await git.init({ fs: nodeFs, dir });
      console.log('Initialized empty git repository');
      break;
    }
    case 'status': {
      const matrix = await git.statusMatrix({ fs: nodeFs, dir });
      for (const [filepath, head, workdir] of matrix) {
        const status = head === 0 ? '??' : workdir === 0 ? 'D ' : head === workdir ? '  ' : 'M ';
        console.log(`${status} ${filepath}`);
      }
      break;
    }
    case 'add': {
      const filepath = args[1];
      await git.add({ fs: nodeFs, dir, filepath });
      console.log(`Added ${filepath}`);
      break;
    }
    case 'commit': {
      const message = args.slice(1).join(' ') || 'Update';
      const sha = await git.commit({ fs: nodeFs, dir, message, author: { name: 'nike', email: 'nike@local' } });
      console.log(`Committed: ${sha}`);
      break;
    }
    case 'log': {
      const logs = await git.log({ fs: nodeFs, dir, depth: 10 });
      for (const l of logs) {
        console.log(`${l.oid.slice(0,7)} ${l.commit.message.split('\n')[0]}`);
      }
      break;
    }
    case 'pull': {
      await git.pull({ fs: nodeFs, http, dir, author: { name: 'nike', email: 'nike@local' } });
      console.log('Pulled successfully');
      break;
    }
    case 'push': {
      // push needs auth - warn user
      console.log('Push requires authentication. Set up credentials first.');
      break;
    }
    default:
      console.log(`使い方: bun tools/git.js <command> [args]
Commands:
  clone <url> [dir]  - リポジトリをクローン
  init               - 現在のディレクトリでgit初期化
  status             - 変更状態を表示
  add <file>         - ファイルをステージング
  commit <message>   - コミット
  log                - コミット履歴を表示
  pull               - プル
  push               - プッシュ（要認証）`);
  }
};

run().catch(e => console.error(`エラー: ${e.message}`));
