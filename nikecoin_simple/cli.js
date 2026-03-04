#!/usr/bin/env node
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'nikecoin.db');
let db;
let SQL;

// Initialize database
async function initDb() {
  SQL = await initSqlJs();
  
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
  
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    from_user TEXT,
    to_user TEXT,
    amount INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  saveDb();
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function getBalance(userId) {
  const stmt = db.prepare('SELECT balance FROM wallets WHERE user_id = ?');
  stmt.bind([userId]);
  let balance = 0;
  if (stmt.step()) {
    balance = stmt.get()[0];
  }
  stmt.free();
  return balance;
}

function mint(userId, amount, description = '') {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  const existing = getBalance(userId);
  if (existing === 0) {
    db.run('INSERT OR REPLACE INTO wallets (user_id, balance) VALUES (?, ?)', [userId, amount]);
  } else {
    db.run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, userId]);
  }
  
  db.run(
    'INSERT INTO transactions (id, type, to_user, amount, description) VALUES (?, ?, ?, ?, ?)',
    [id, 'mint', userId, amount, description]
  );
  
  saveDb();
  return getBalance(userId);
}

function transfer(from, to, amount, description = '') {
  const fromBalance = getBalance(from);
  if (fromBalance < amount) {
    throw new Error(`Insufficient balance: ${fromBalance} < ${amount}`);
  }
  
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  db.run('UPDATE wallets SET balance = balance - ? WHERE user_id = ?', [amount, from]);
  
  const toExisting = getBalance(to);
  if (toExisting === 0) {
    db.run('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [to, amount]);
  } else {
    db.run('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [amount, to]);
  }
  
  db.run(
    'INSERT INTO transactions (id, type, from_user, to_user, amount, description) VALUES (?, ?, ?, ?, ?, ?)',
    [id, 'transfer', from, to, amount, description]
  );
  
  saveDb();
  return { fromBalance: getBalance(from), toBalance: getBalance(to) };
}

function list() {
  const stmt = db.prepare('SELECT user_id, balance FROM wallets ORDER BY balance DESC');
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// CLI
async function main() {
  await initDb();
  
  const [,, command, ...args] = process.argv;

  switch (command) {
    case 'balance': {
      const userId = args[0];
      if (!userId) {
        console.error('Usage: node cli.js balance <userId>');
        process.exit(1);
      }
      const balance = getBalance(userId);
      console.log(JSON.stringify({ userId, balance }, null, 2));
      break;
    }
    
    case 'mint': {
      const [userId, amountStr, ...descParts] = args;
      const amount = parseInt(amountStr, 10) || 0;
      if (!userId) {
        console.error('Usage: node cli.js mint <userId> <amount> [description]');
        process.exit(1);
      }
      const newBalance = mint(userId, amount, descParts.join(' '));
      console.log(JSON.stringify({ userId, amount, newBalance }, null, 2));
      break;
    }
    
    case 'transfer': {
      const [from, to, amountStr, ...descParts] = args;
      const amount = parseInt(amountStr, 10);
      if (!from || !to || isNaN(amount)) {
        console.error('Usage: node cli.js transfer <from> <to> <amount> [description]');
        process.exit(1);
      }
      try {
        const result = transfer(from, to, amount, descParts.join(' '));
        console.log(JSON.stringify({ from, to, amount, ...result }, null, 2));
      } catch (e) {
        console.error(JSON.stringify({ error: e.message }, null, 2));
        process.exit(1);
      }
      break;
    }
    
    case 'list': {
      const wallets = list();
      console.log(JSON.stringify({ count: wallets.length, wallets }, null, 2));
      break;
    }
    
    default:
      console.log(`
NikeCoin Simple CLI (sql.js版)

Commands:
  balance <userId>                    - Check balance
  mint <userId> <amount> [desc]       - Mint coins
  transfer <from> <to> <amount> [desc] - Transfer coins
  list                                - List all wallets
`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
