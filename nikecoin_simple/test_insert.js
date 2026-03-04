const initSqlJs = require('sql.js');
const fs = require('fs');

async function test() {
  const SQL = await initSqlJs();
  
  let db;
  if (fs.existsSync('nikecoin.db')) {
    const filebuffer = fs.readFileSync('nikecoin.db');
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create table
  db.run(`CREATE TABLE IF NOT EXISTS wallets (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0
  )`);
  
  // Insert test data
  db.run('INSERT OR REPLACE INTO wallets (user_id, balance) VALUES (?, ?)', ['test_user', 100]);
  
  // Save
  const data = db.export();
  fs.writeFileSync('test.db', Buffer.from(data));
  
  // Read back
  const stmt = db.prepare('SELECT * FROM wallets');
  console.log('After insert:');
  while (stmt.step()) {
    console.log(stmt.getAsObject());
  }
  stmt.free();
}

test();
