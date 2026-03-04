const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'nikecoin.db');

async function test() {
  const SQL = await initSqlJs();
  
  let db;
  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS wallets (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0
  )`);
  
  // Test mint logic
  const userId = '195028089577799680';
  const amount = 0;
  
  // Check existing
  const stmt = db.prepare('SELECT balance FROM wallets WHERE user_id = ?');
  stmt.bind([userId]);
  let existing = 0;
  if (stmt.step()) {
    existing = stmt.get()[0];
    console.log('Existing balance:', existing);
  } else {
    console.log('No existing record');
  }
  stmt.free();
  
  // Insert or update
  if (existing === 0) {
    console.log('Inserting new record...');
    db.run('INSERT OR REPLACE INTO wallets (user_id, balance) VALUES (?, ?)', [userId, amount]);
  } else {
    console.log('Updating existing record...');
    db.run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, userId]);
  }
  
  // Save
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
  
  // Verify
  const stmt2 = db.prepare('SELECT * FROM wallets');
  console.log('Final state:');
  while (stmt2.step()) {
    console.log(stmt2.getAsObject());
  }
  stmt2.free();
}

test().catch(console.error);
