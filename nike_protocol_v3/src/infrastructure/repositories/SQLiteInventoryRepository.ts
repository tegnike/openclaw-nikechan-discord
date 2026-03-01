import { ok, err, type Result } from 'neverthrow';
import type { InventoryRepository } from '../../core/domain/gacha/InventoryRepository.js';
import { Inventory } from '../../core/domain/gacha/Inventory.js';
import type { Database } from '../database/Database.js';

interface TitleRow {
  id: string;
  name: string;
  rarity: string;
}

export class SQLiteInventoryRepository implements InventoryRepository {
  constructor(private db: Database) {}

  async findByDiscordId(discordId: string): Promise<Result<Inventory, Error>> {
    try {
      const stmt = this.db.prepare(`
        SELECT t.id, t.name, t.rarity 
        FROM gacha_inventory gi 
        JOIN titles t ON gi.title_id = t.id 
        WHERE gi.discord_id = ?
      `);
      const rows = stmt.all(discordId) as TitleRow[];
      
      const titleIds = rows.map(r => r.id);
      return ok(Inventory.create(titleIds));
    } catch (e) {
      return err(new Error(`Failed to find inventory: ${e}`));
    }
  }

  async addTitle(discordId: string, titleId: string): Promise<Result<void, Error>> {
    try {
      const stmt = this.db.prepare(
        'INSERT OR IGNORE INTO gacha_inventory (discord_id, title_id, obtained_at) VALUES (?, ?, datetime("now"))'
      );
      stmt.run(discordId, titleId);
      return ok(undefined);
    } catch (e) {
      return err(new Error(`Failed to add title: ${e}`));
    }
  }

  async save(discordId: string, inventory: Inventory): Promise<Result<void, Error>> {
    try {
      const insertStmt = this.db.prepare(
        'INSERT OR IGNORE INTO gacha_inventory (discord_id, title_id, obtained_at) VALUES (?, ?, datetime("now"))'
      );
      
      for (const titleId of inventory.titleIds) {
        insertStmt.run(discordId, titleId);
      }
      
      return ok(undefined);
    } catch (e) {
      return err(new Error(`Failed to save inventory: ${e}`));
    }
  }
}
