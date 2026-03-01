import type { Result } from 'neverthrow';
import type { Inventory } from './Inventory.js';

export interface InventoryRepository {
  findByDiscordId(discordId: string): Promise<Result<Inventory, Error>>;
  addTitle(discordId: string, titleId: string): Promise<Result<void, Error>>;
  save(discordId: string, inventory: Inventory): Promise<Result<void, Error>>;
}
