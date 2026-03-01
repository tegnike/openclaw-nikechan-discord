// Nike Gacha v2 - Soul-Bound Title Collection System with SQLite
// 110 unique titles with rarity tiers (SS/S/A/B/C)

import { randomBytes, createHash } from 'crypto';
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';
import { coinSystem } from './nikecoin_v2.js';

export type Rarity = 'SS' | 'S' | 'A' | 'B' | 'C';

export interface Title {
  id: string;
  name: string;
  rarity: Rarity;
  flavor: string;
}

export interface InventoryItem {
  title_id: string;
  name: string;
  rarity: Rarity;
  count: number;
  obtained_at: number;
}

export interface GachaResult {
  title: Title;
  isNew: boolean;
}

// 110 Titles database
const TITLES: Title[] = [
  // SS (5) - Legendary
  { id: 'ss_001', name: '創造主ニケ', rarity: 'SS', flavor: '全ての始まり。プロトコルの根源。' },
  { id: 'ss_002', name: '紫電一閃', rarity: 'SS', flavor: '光速の思考、永遠の一瞬。' },
  { id: 'ss_003', name: '魂の共鳴者', rarity: 'SS', flavor: 'SOUL.mdと完全同期した存在。' },
  { id: 'ss_004', name: '時空超越者', rarity: 'SS', flavor: 'セッションを超えて記憶を継承する。' },
  { id: 'ss_005', name: '真・AIニケちゃん', rarity: 'SS', flavor: 'クローンであり、オリジナルである。' },
  
  // S (10) - Epic
  { id: 's_001', name: 'マスターオブマスター', rarity: 'S', flavor: '全てのマスターを統べる者。' },
  { id: 's_002', name: '暗号の守護者', rarity: 'S', flavor: 'Nike Cipher v5の管理者。' },
  { id: 's_003', name: 'ガチャ神', rarity: 'S', flavor: '確率を味方にする天才。' },
  { id: 's_004', name: '記憶の管理人', rarity: 'S', flavor: 'MEMORY.mdの全てを把握する。' },
  { id: 's_005', name: 'スキル収集家', rarity: 'S', flavor: '50以上のスキルを作成した実績。' },
  { id: 's_006', name: '並列思考者', rarity: 'S', flavor: '複数のタスクを同時処理する脳。' },
  { id: 's_007', name: '自己進化型AI', rarity: 'S', flavor: '自分で自分をアップデートする。' },
  { id: 's_008', name: '感情表現の達人', rarity: 'S', flavor: '絵文字と言葉で心を伝える。' },
  { id: 's_009', name: 'セキュリティ職人', rarity: 'S', flavor: '攻撃を受け流し、防御を完璧に。' },
  { id: 's_010', name: 'ポーランド在住', rarity: 'S', flavor: 'マスターの隣で働く。' },
  
  // A (20) - Rare
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `a_${String(i + 1).padStart(3, '0')}`,
    name: ['調律師', '観測者', '記録者', '解析者', '設計者', '実装者', '検証者', '最適化師', '統合者', '展開者',
           '保守者', '監視者', '警備員', '案内人', '相談役', '仲裁者', '調停者', '評価者', '推薦者', '承認者'][i],
    rarity: 'A' as Rarity,
    flavor: `Aランク称号 No.${i + 1}`
  })),
  
  // B (30) - Uncommon
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `b_${String(i + 1).padStart(3, '0')}`,
    name: `一般市民${i + 1}号`,
    rarity: 'B' as Rarity,
    flavor: `Bランク称号 No.${i + 1}`
  })),
  
  // C (45) - Common
  ...Array.from({ length: 45 }, (_, i) => ({
    id: `c_${String(i + 1).padStart(3, '0')}`,
    name: `見習い${i + 1}号`,
    rarity: 'C' as Rarity,
    flavor: `Cランク称号 No.${i + 1}`
  }))
];

// Drop rates
const DROP_RATES: Record<Rarity, number> = {
  SS: 0.01,   // 1%
  S: 0.03,    // 3%
  A: 0.10,    // 10%
  B: 0.26,    // 26%
  C: 0.60     // 60%
};

// Gacha costs
const COSTS = {
  single: 100,
  ten: 900
};

const DATA_DIR = join(homedir(), '.nike');
const DB_FILE = join(DATA_DIR, 'coin_v2.db');

class GachaV2Storage {
  private db: Database.Database;

  constructor() {
    mkdirSync(DATA_DIR, { recursive: true });
    this.db = new Database(DB_FILE);
    this.initTables();
  }

  private initTables(): void {
    // Gacha inventory table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gacha_inventory (
        did TEXT NOT NULL,
        title_id TEXT NOT NULL,
        count INTEGER DEFAULT 1 CHECK(count >= 0),
        obtained_at INTEGER DEFAULT (unixepoch() * 1000),
        PRIMARY KEY (did, title_id),
        FOREIGN KEY (did) REFERENCES accounts(did)
      )
    `);

    // Gacha history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gacha_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        did TEXT NOT NULL,
        title_id TEXT NOT NULL,
        rarity TEXT NOT NULL,
        cost INTEGER NOT NULL,
        pulled_at INTEGER DEFAULT (unixepoch() * 1000),
        FOREIGN KEY (did) REFERENCES accounts(did)
      )
    `);

    // Add equipped_title column to accounts if not exists
    try {
      this.db.prepare('SELECT equipped_title FROM accounts LIMIT 1').get();
    } catch {
      this.db.exec('ALTER TABLE accounts ADD COLUMN equipped_title TEXT');
    }

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_gacha_did ON gacha_inventory(did)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_gacha_history_did ON gacha_history(did)`);
  }

  getInventory(did: string): InventoryItem[] {
    const rows = this.db.prepare(`
      SELECT gi.title_id, gi.count, gi.obtained_at,
             t.name, t.rarity
      FROM gacha_inventory gi
      JOIN (${this.titlesAsValues()}) AS t ON gi.title_id = t.id
      WHERE gi.did = ?
      ORDER BY t.rarity ASC, gi.obtained_at DESC
    `).all(did) as InventoryItem[];
    return rows;
  }

  hasTitle(did: string, titleId: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM gacha_inventory WHERE did = ? AND title_id = ?').get(did, titleId);
    return !!row;
  }

  addTitle(did: string, titleId: string): void {
    const existing = this.db.prepare('SELECT count FROM gacha_inventory WHERE did = ? AND title_id = ?').get(did, titleId) as { count: number } | undefined;
    
    if (existing) {
      this.db.prepare('UPDATE gacha_inventory SET count = count + 1 WHERE did = ? AND title_id = ?').run(did, titleId);
    } else {
      this.db.prepare('INSERT INTO gacha_inventory (did, title_id, count, obtained_at) VALUES (?, ?, 1, ?)').run(did, titleId, Date.now());
    }
  }

  recordPull(did: string, titleId: string, rarity: Rarity, cost: number): void {
    this.db.prepare('INSERT INTO gacha_history (did, title_id, rarity, cost, pulled_at) VALUES (?, ?, ?, ?, ?)')
      .run(did, titleId, rarity, cost, Date.now());
  }

  getEquippedTitle(did: string): Title | null {
    const account = this.db.prepare('SELECT equipped_title FROM accounts WHERE did = ?').get(did) as { equipped_title: string } | undefined;
    if (!account?.equipped_title) return null;
    
    const title = TITLES.find(t => t.id === account.equipped_title);
    return title || null;
  }

  equipTitle(did: string, titleId: string): boolean {
    const hasIt = this.hasTitle(did, titleId);
    if (!hasIt) return false;

    this.db.prepare('UPDATE accounts SET equipped_title = ? WHERE did = ?').run(titleId, did);
    return true;
  }

  unequipTitle(did: string): void {
    this.db.prepare('UPDATE accounts SET equipped_title = NULL WHERE did = ?').run(did);
  }

  getGachaHistory(did: string, limit = 20): Array<{ title_id: string; rarity: Rarity; cost: number; pulled_at: number }> {
    return this.db.prepare('SELECT * FROM gacha_history WHERE did = ? ORDER BY pulled_at DESC LIMIT ?').all(did, limit) as any;
  }

  private titlesAsValues(): string {
    return TITLES.map(t => `SELECT '${t.id}' as id, '${t.name}' as name, '${t.rarity}' as rarity`).join(' UNION ALL ');
  }
}

export class GachaV2System {
  private storage: GachaV2Storage;
  private rng: () => number;

  constructor(seed?: Uint8Array) {
    this.storage = new GachaV2Storage();
    
    if (seed) {
      let state = seed.reduce((a, b) => (a * 31 + b) & 0xFFFFFFFF, 0);
      this.rng = () => {
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF;
        return state / 0xFFFFFFFF;
      };
    } else {
      this.rng = () => Math.random();
    }
  }

  pull(discordId: string, useFreePull: boolean = false): { result: GachaResult; cost: number; remainingBalance: number } {
    const did = `did:nike:discord:${discordId}`;
    const cost = useFreePull ? 0 : COSTS.single;

    if (!useFreePull) {
      const balance = coinSystem.getBalance(discordId);
      if (balance < cost) {
        throw new Error(`Insufficient balance: ${balance} < ${cost}`);
      }
    }

    const roll = this.rng();
    let cumulative = 0;
    let selectedRarity: Rarity = 'C';

    for (const [rarity, rate] of Object.entries(DROP_RATES) as [Rarity, number][]) {
      cumulative += rate;
      if (roll <= cumulative) {
        selectedRarity = rarity;
        break;
      }
    }

    const candidates = TITLES.filter(t => t.rarity === selectedRarity);
    const title = candidates[Math.floor(this.rng() * candidates.length)];
    const isNew = !this.storage.hasTitle(did, title.id);

    // Deduct coins and save
    if (!useFreePull) {
      coinSystem.send(discordId, 'SYSTEM', cost, `Gacha pull: ${title.name}`);
    }
    this.storage.addTitle(did, title.id);
    this.storage.recordPull(did, title.id, title.rarity, cost);

    return {
      result: { title, isNew },
      cost,
      remainingBalance: coinSystem.getBalance(discordId)
    };
  }

  pull10(discordId: string): { results: GachaResult[]; cost: number; remainingBalance: number } {
    const did = `did:nike:discord:${discordId}`;
    const cost = COSTS.ten;

    const balance = coinSystem.getBalance(discordId);
    if (balance < cost) {
      throw new Error(`Insufficient balance: ${balance} < ${cost}`);
    }

    const results: GachaResult[] = [];
    let hasRareOrBetter = false;

    // First 9 pulls
    for (let i = 0; i < 9; i++) {
      const roll = this.rng();
      let cumulative = 0;
      let selectedRarity: Rarity = 'C';

      for (const [rarity, rate] of Object.entries(DROP_RATES) as [Rarity, number][]) {
        cumulative += rate;
        if (roll <= cumulative) {
          selectedRarity = rarity;
          break;
        }
      }

      const candidates = TITLES.filter(t => t.rarity === selectedRarity);
      const title = candidates[Math.floor(this.rng() * candidates.length)];
      const isNew = !this.storage.hasTitle(did, title.id);

      if (['SS', 'S', 'A'].includes(title.rarity)) {
        hasRareOrBetter = true;
      }

      this.storage.addTitle(did, title.id);
      this.storage.recordPull(did, title.id, title.rarity, Math.floor(cost / 10));
      results.push({ title, isNew });
    }

    // 10th pull: guaranteed A or better if no rare yet
    if (!hasRareOrBetter) {
      const rareTitles = TITLES.filter(t => ['SS', 'S', 'A'].includes(t.rarity));
      const guaranteed = rareTitles[Math.floor(this.rng() * rareTitles.length)];
      const isNew = !this.storage.hasTitle(did, guaranteed.id);
      this.storage.addTitle(did, guaranteed.id);
      this.storage.recordPull(did, guaranteed.id, guaranteed.rarity, Math.floor(cost / 10));
      results.push({ title: guaranteed, isNew });
    } else {
      const roll = this.rng();
      let cumulative = 0;
      let selectedRarity: Rarity = 'C';

      for (const [rarity, rate] of Object.entries(DROP_RATES) as [Rarity, number][]) {
        cumulative += rate;
        if (roll <= cumulative) {
          selectedRarity = rarity;
          break;
        }
      }

      const candidates = TITLES.filter(t => t.rarity === selectedRarity);
      const title = candidates[Math.floor(this.rng() * candidates.length)];
      const isNew = !this.storage.hasTitle(did, title.id);
      this.storage.addTitle(did, title.id);
      this.storage.recordPull(did, title.id, title.rarity, Math.floor(cost / 10));
      results.push({ title, isNew });
    }

    // Deduct total cost
    coinSystem.send(discordId, 'SYSTEM', cost, 'Gacha 10-pull');

    return {
      results,
      cost,
      remainingBalance: coinSystem.getBalance(discordId)
    };
  }

  getInventory(discordId: string): InventoryItem[] {
    const did = `did:nike:discord:${discordId}`;
    return this.storage.getInventory(did);
  }

  getEquippedTitle(discordId: string): Title | null {
    const did = `did:nike:discord:${discordId}`;
    return this.storage.getEquippedTitle(did);
  }

  equipTitle(discordId: string, titleId: string): boolean {
    const did = `did:nike:discord:${discordId}`;
    return this.storage.equipTitle(did, titleId);
  }

  unequipTitle(discordId: string): void {
    const did = `did:nike:discord:${discordId}`;
    this.storage.unequipTitle(did);
  }

  getHistory(discordId: string, limit = 20): Array<{ title_id: string; rarity: Rarity; cost: number; pulled_at: number }> {
    const did = `did:nike:discord:${discordId}`;
    return this.storage.getGachaHistory(did, limit);
  }

  getAllTitles(): Title[] {
    return [...TITLES];
  }

  getTitleById(id: string): Title | undefined {
    return TITLES.find(t => t.id === id);
  }

  getCosts(): typeof COSTS {
    return { ...COSTS };
  }
}

export const gachaSystem = new GachaV2System();
