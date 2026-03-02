#!/usr/bin/env node
import { EncryptedDatabase } from '../src/infrastructure/database/EncryptedDatabase.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.NIKECOIN_DB_PATH || './data/coin_v3.db';
const ENCRYPTION_KEY = process.env.NIKE_COIN_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('❌ Error: NIKE_COIN_ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('🔐 Initializing Nike Protocol v3 Database...');
console.log(`   Path: ${DB_PATH}`);
console.log('');

try {
  const db = new EncryptedDatabase(DB_PATH, ENCRYPTION_KEY);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      did TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      from_did TEXT,
      to_did TEXT,
      description TEXT,
      signature TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventories (
      id TEXT PRIMARY KEY,
      did TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS titles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rarity TEXT NOT NULL,
      description TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_titles (
      inventory_id TEXT NOT NULL,
      title_id TEXT NOT NULL,
      obtained_at TEXT NOT NULL,
      PRIMARY KEY (inventory_id, title_id),
      FOREIGN KEY (inventory_id) REFERENCES inventories(id),
      FOREIGN KEY (title_id) REFERENCES titles(id)
    )
  `);

  // Insert default titles
  const insertTitle = db.prepare('INSERT OR IGNORE INTO titles (id, name, rarity, description) VALUES (?, ?, ?, ?)');
  
  // SS (5種)
  const ssNames = ['伝説の勇者', '神々しい存在', '世界を救いし者', '時空を超えし者', '永遠の守護者'];
  for (let i = 1; i <= 5; i++) {
    insertTitle.run(`ss_${i}`, ssNames[i-1], 'SS', `SSランク称号 #${i}`);
  }
  
  // S (10種)
  for (let i = 1; i <= 10; i++) {
    insertTitle.run(`s_${i}`, `Sランク称号 ${i}`, 'S', `Sランク称号 #${i}`);
  }
  
  // A (20種)
  for (let i = 1; i <= 20; i++) {
    insertTitle.run(`a_${i}`, `Aランク称号 ${i}`, 'A', `Aランク称号 #${i}`);
  }
  
  // B (30種)
  for (let i = 1; i <= 30; i++) {
    insertTitle.run(`b_${i}`, `Bランク称号 ${i}`, 'B', `Bランク称号 #${i}`);
  }
  
  // C (40種)
  for (let i = 1; i <= 40; i++) {
    insertTitle.run(`c_${i}`, `Cランク称号 ${i}`, 'C', `Cランク称号 #${i}`);
  }

  console.log('✅ Database initialized successfully!');
  console.log('');
  console.log('📊 Tables created:');
  console.log('   • wallets');
  console.log('   • transactions');
  console.log('   • inventories');
  console.log('   • titles (110 titles inserted)');
  console.log('   • inventory_titles');
  console.log('');
  console.log('🎮 Ready to use!');
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}
