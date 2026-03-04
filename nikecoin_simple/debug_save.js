const initSqlJs = require('sql.js');
const fs = require('fs');

async function test() {
  const SQL = await initSqlJs();
  
  // 新規DB作成
  let db = new SQL.Database();
  
  // テーブル作成
  db.run(`CREATE TABLE IF NOT EXISTS wallets (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0
  )`);
  
  // データ挿入
  db.run('INSERT OR REPLACE INTO wallets (user_id, balance) VALUES (?, ?)', ['195028089577799680', 0]);
  
  // メモリ上で確認
  let stmt = db.prepare('SELECT * FROM wallets');
  console.log('Before save:');
  while (stmt.step()) {
    console.log(stmt.getAsObject());
  }
  stmt.free();
  
  // 保存
  const data = db.export();
  console.log('Export size:', data.length);
  fs.writeFileSync('nikecoin.db', Buffer.from(data));
  console.log('Saved to nikecoin.db');
  
  // 再読み込み
  const filebuffer = fs.readFileSync('nikecoin.db');
  const db2 = new SQL.Database(filebuffer);
  
  stmt = db2.prepare('SELECT * FROM wallets');
  console.log('After reload:');
  while (stmt.step()) {
    console.log(stmt.getAsObject());
  }
  stmt.free();
}

test().catch(console.error);
