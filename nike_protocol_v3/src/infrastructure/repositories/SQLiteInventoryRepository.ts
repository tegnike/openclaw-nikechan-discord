import { InventoryRepository } from '../../core/domain/gacha/repositories/InventoryRepository.js';
import { Inventory } from '../../core/domain/gacha/Inventory.js';
import { Title } from '../../core/domain/gacha/Title.js';
import { EncryptedDatabase } from '../database/EncryptedDatabase.js';

export class SQLiteInventoryRepository implements InventoryRepository {
  private db: EncryptedDatabase;

  constructor(dbPath: string, encryptionKey: string) {
    this.db = new EncryptedDatabase(dbPath, encryptionKey);
    this.initializeTable();
  }

  private initializeTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inventories (
        id TEXT PRIMARY KEY,
        did TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS titles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        description TEXT
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inventory_titles (
        inventory_id TEXT NOT NULL,
        title_id TEXT NOT NULL,
        obtained_at TEXT NOT NULL,
        PRIMARY KEY (inventory_id, title_id),
        FOREIGN KEY (inventory_id) REFERENCES inventories(id),
        FOREIGN KEY (title_id) REFERENCES titles(id)
      )
    `);

    // Insert default titles if not exists
    this.insertDefaultTitles();
  }

  private insertDefaultTitles(): void {
    const insertTitle = this.db.prepare('INSERT OR IGNORE INTO titles (id, name, rarity, description) VALUES (?, ?, ?, ?)');
    
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
  }

  async findByDid(did: string): Promise<Inventory | null> {
    const row = this.db.prepare(
      'SELECT * FROM inventories WHERE did = ?'
    ).get(did) as { id: string; did: string; created_at: string } | undefined;

    if (!row) {
      return null;
    }

    const titleRows = this.db.prepare(
      `SELECT t.* FROM titles t
       JOIN inventory_titles it ON t.id = it.title_id
       WHERE it.inventory_id = ?`
    ).all(row.id) as Array<{ id: string; name: string; rarity: string; description: string }>;

    const titles = titleRows.map(t => new Title({
      id: t.id,
      name: t.name,
      rarity: t.rarity as 'SS' | 'S' | 'A' | 'B' | 'C',
      description: t.description
    }));

    return new Inventory({
      id: row.id,
      did: row.did,
      titles,
      createdAt: new Date(row.created_at)
    });
  }

  async addTitle(did: string, titleId: string): Promise<void> {
    // Get or create inventory
    let inventory = await this.findByDid(did);
    
    if (!inventory) {
      // Create new inventory
      const newInventory = new Inventory({
        did,
        titles: [],
        createdAt: new Date()
      });
      
      this.db.prepare(
        'INSERT INTO inventories (id, did, created_at) VALUES (?, ?, ?)'
      ).run(newInventory.id, did, newInventory.createdAt.toISOString());
      
      inventory = newInventory;
    }

    // Add title to inventory
    this.db.prepare(
      'INSERT OR IGNORE INTO inventory_titles (inventory_id, title_id, obtained_at) VALUES (?, ?, ?)'
    ).run(inventory.id, titleId, new Date().toISOString());
  }

  async save(inventory: Inventory): Promise<void> {
    this.db.prepare(
      `INSERT OR REPLACE INTO inventories (id, did, created_at) 
       VALUES (?, ?, ?)`
    ).run(inventory.id, inventory.did, inventory.createdAt.toISOString());

    // Save all titles
    for (const title of inventory.titles) {
      this.db.prepare(
        'INSERT OR IGNORE INTO inventory_titles (inventory_id, title_id, obtained_at) VALUES (?, ?, ?)'
      ).run(inventory.id, title.id, new Date().toISOString());
    }
  }
}
