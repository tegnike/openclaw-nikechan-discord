import { Inventory } from '../Inventory.js';

export interface InventoryRepository {
  findByDid(did: string): Promise<Inventory | null>;
  addTitle(did: string, titleId: string): Promise<void>;
  save(inventory: Inventory): Promise<void>;
}
