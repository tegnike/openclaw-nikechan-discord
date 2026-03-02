// ============================================
// ReNikeProtocol - Inventory Repository
// ============================================

import { getDB, withTransaction } from '../db/connection.js';
import { DID, UserInventory, InventoryItem } from '../core/types.js';
import { NikeError } from '../core/errors.js';

export class InventoryRepository {
  /**
   * Get inventory by DID
   */
  async findByDID(did: DID): Promise<UserInventory | null> {
    const db = getDB();
    const row = await db.get(
      'SELECT * FROM inventories WHERE did = ?',
      did
    );

    if (!row) return null;

    const items: InventoryItem[] = JSON.parse(row.items);

    return {
      did: row.did as DID,
      items: items.map(item => ({
        titleId: item.titleId,
        obtainedAt: new Date(item.obtainedAt)
      }))
    };
  }

  /**
   * Create empty inventory for user
   */
  async create(did: DID): Promise<UserInventory> {
    const db = getDB();

    await db.run(
      `INSERT INTO inventories (did, items, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(did) DO NOTHING`,
      did, JSON.stringify([])
    );

    const inventory = await this.findByDID(did);
    if (!inventory) {
      throw new NikeError('Failed to create inventory', 'CREATE_FAILED');
    }

    return inventory;
  }

  /**
   * Add title to inventory
   */
  async addTitle(did: DID, titleId: string): Promise<UserInventory> {
    return withTransaction(async () => {
      const db = getDB();

      // Get current inventory
      let inventory = await this.findByDID(did);
      if (!inventory) {
        inventory = await this.create(did);
      }

      // Check if already owned
      if (inventory.items.some(item => item.titleId === titleId)) {
        // Duplicate is allowed but we don't add it again
        return inventory;
      }

      // Add new item
      const newItems = [...inventory.items, {
        titleId,
        obtainedAt: new Date()
      }];

      await db.run(
        `UPDATE inventories 
         SET items = ?, updated_at = CURRENT_TIMESTAMP
         WHERE did = ?`,
        JSON.stringify(newItems), did
      );

      const updated = await this.findByDID(did);
      if (!updated) {
        throw new NikeError('Failed to update inventory', 'UPDATE_FAILED');
      }

      return updated;
    });
  }

  /**
   * Get collection progress
   */
  async getProgress(did: DID): Promise<{
    owned: number;
    total: number;
    percentage: number;
    byRarity: Record<string, { owned: number; total: number }>;
  }> {
    const { TITLES } = await import('../gacha/titles.js');
    const inventory = await this.findByDID(did);

    const ownedIds = new Set(inventory?.items.map(i => i.titleId) ?? []);
    const total = TITLES.length;

    const byRarity: Record<string, { owned: number; total: number }> = {};

    for (const rarity of ['SS', 'S', 'A', 'B', 'C'] as const) {
      const rarityTitles = TITLES.filter(t => t.rarity === rarity);
      const rarityOwned = rarityTitles.filter(t => ownedIds.has(t.id)).length;
      byRarity[rarity] = {
        owned: rarityOwned,
        total: rarityTitles.length
      };
    }

    return {
      owned: ownedIds.size,
      total,
      percentage: Math.round((ownedIds.size / total) * 100),
      byRarity
    };
  }
}
