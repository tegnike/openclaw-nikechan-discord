const initSqlJs = require('sql.js');

async function test() {
  const SQL = await initSqlJs();
  const fs = require('fs');
  
  let db;
  if (fs.existsSync('nikecoin.db')) {
    const filebuffer = fs.readFileSync('nikecoin.db');
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Check wallets table
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

test();
