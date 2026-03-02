import { Title } from './Title.js';

export interface InventoryData {
  id?: string;
  did: string;
  titles: Title[];
  createdAt?: Date;
}

export class Inventory {
  readonly id: string;
  readonly did: string;
  readonly titles: Title[];
  readonly createdAt: Date;

  constructor(data: InventoryData) {
    this.id = data.id || crypto.randomUUID();
    this.did = data.did;
    this.titles = data.titles;
    this.createdAt = data.createdAt || new Date();
  }

  static create(data: InventoryData): Inventory {
    return new Inventory(data);
  }
}
