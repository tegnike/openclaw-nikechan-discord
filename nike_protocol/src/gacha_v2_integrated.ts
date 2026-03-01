// Nike Gacha v2 - Integrated with EncryptedCoinStorage
// Unified system with encrypted database

import { randomBytes } from 'crypto';
import type { Database } from 'better-sqlite3';
import type { CoinService } from './services/CoinService.js';

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
  
  // C (40) - Common
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `c_${String(i + 1).padStart(3, '0')}`,
    name: `見習い${i + 1}号`,
    rarity: 'C' as Rarity,
    flavor: `Cランク称号 No.${i + 1}`
  }))
];

// Drop rates
const DROP_RATES: Record<Rarity, number> = {
  SS: 0.005,  // 0.5%
  S: 0.03,    // 3%
  A: 0.10,    // 10%
  B: 0.265,   // 26.5%
  C: 0.60     // 60%
};

// Gacha costs
const COSTS = {
  single: 10,
  ten: 90
};

export class GachaV2Integrated {
  private db: Database;
  private coinService: CoinService;

  constructor(db: Database, coinService: CoinService) {
    this.db = db;
    this.coinService = coinService;
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
        PRIMARY KEY (did, title_id)
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
        pulled_at INTEGER DEFAULT (unixepoch() * 1000)
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

  private titlesAsValues(): string {
    return TITLES.map(t => `SELECT '${t.id}' as id, '${t.name}' as name, '${t.rarity}' as rarity`).join(' UNION ALL ');
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

  private rollRarity(): Rarity {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [rarity, rate] of Object.entries(DROP_RATES)) {
      cumulative += rate;
      if (rand <= cumulative) return rarity as Rarity;
    }
    return 'C';
  }

  private getRandomTitle(rarity: Rarity): Title {
    const titles = TITLES.filter(t => t.rarity === rarity);
    return titles[Math.floor(Math.random() * titles.length)];
  }

  pull(discordId: string, useFreePull: boolean = false): { result: GachaResult; cost: number; remainingBalance: number } {
    const did = `did:nike:discord:${discordId}`;
    const cost = useFreePull ? 0 : COSTS.single;

    if (!useFreePull) {
      const balance = this.coinService.getBalance(discordId);
      if (balance < cost) {
        throw new Error(`Insufficient balance: ${balance} < ${cost}`);
      }
      this.coinService.burn(discordId, cost, `Gacha pull`);
    }

    const rarity = this.rollRarity();
    const title = this.getRandomTitle(rarity);
    const isNew = !this.hasTitle(did, title.id);

    this.addTitle(did, title.id);
    this.recordPull(did, title.id, rarity, cost);

    return {
      result: { title, isNew },
      cost,
      remainingBalance: this.coinService.getBalance(discordId)
    };
  }

  pull10(discordId: string): { results: GachaResult[]; cost: number; remainingBalance: number } {
    const did = `did:nike:discord:${discordId}`;
    const cost = COSTS.ten;

    const balance = this.coinService.getBalance(discordId);
    if (balance < cost) {
      throw new Error(`Insufficient balance: ${balance} < ${cost}`);
    }

    this.coinService.burn(discordId, cost, 'Gacha 10-pull');

    const results: GachaResult[] = [];
    for (let i = 0; i < 10; i++) {
      const rarity = this.rollRarity();
      const title = this.getRandomTitle(rarity);
      const isNew = !this.hasTitle(did, title.id);

      this.addTitle(did, title.id);
      this.recordPull(did, title.id, rarity, cost / 10);

      results.push({ title, isNew });
    }

    return {
      results,
      cost,
      remainingBalance: this.coinService.getBalance(discordId)
    };
  }

  getAllTitles(): Title[] {
    return [...TITLES];
  }

  getCosts(): { single: number; ten: number } {
    return { ...COSTS };
  }
}
