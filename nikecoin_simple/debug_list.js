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
  
  // Test list function
  console.log('Testing list function...');
  try {
    const stmt = db.prepare('SELECT user_id, balance FROM wallets ORDER BY balance DESC');
    console.log('Statement created');
    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log('Row:', row);
      rows.push(row);
    }
    console.log('Total rows:', rows.length);
    stmt.free();
    console.log('Result:', { count: rows.length, wallets: rows });
  } catch(e) {
    console.error('Error:', e.message);
  }
}

test().catch(console.error);
