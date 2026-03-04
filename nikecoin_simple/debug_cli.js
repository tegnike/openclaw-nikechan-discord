const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'nikecoin.db');
console.log('DB_FILE:', DB_FILE);
console.log('Exists:', fs.existsSync(DB_FILE));

async function test() {
  const SQL = await initSqlJs();
  
  let db;
  if (fs.existsSync(DB_FILE)) {
    console.log('Loading existing DB...');
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    console.log('Creating new DB...');
    db = new SQL.Database();
  }
  
  // Check wallets
  try {
    const stmt = db.prepare('SELECT * FROM wallets');
    console.log('Wallets:');
    while (stmt.step()) {
      console.log(stmt.getAsObject());
    }
    stmt.free();
  } catch(e) {
    console.log('Error:', e.message);
  }
}

test().catch(console.error);
