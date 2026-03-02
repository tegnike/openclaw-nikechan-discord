// ============================================
// ReNikeProtocol - Database Connection
// ============================================

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = process.env.RENIKE_DB_PATH || path.join(DATA_DIR, 'renike.db');

let db: Database<sqlite3.Database> | null = null;

export async function initDB(): Promise<Database<sqlite3.Database>> {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // WAL mode for atomic operations
  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA synchronous = NORMAL');

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      did TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0 CHECK(balance >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT CHECK(type IN ('MINT', 'TRANSFER', 'GACHA')),
      amount INTEGER CHECK(amount > 0),
      from_did TEXT,
      to_did TEXT,
      description TEXT,
      signature TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_did)
  `);
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_did)
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventories (
      did TEXT PRIMARY KEY,
      items TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      did TEXT PRIMARY KEY,
      display_name TEXT,
      total_minted INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0,
      gacha_count INTEGER DEFAULT 0,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

export function getDB(): Database<sqlite3.Database> {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const database = getDB();
  await database.exec('BEGIN TRANSACTION');
  try {
    const result = await fn();
    await database.exec('COMMIT');
    return result;
  } catch (error) {
    await database.exec('ROLLBACK');
    throw error;
  }
}
