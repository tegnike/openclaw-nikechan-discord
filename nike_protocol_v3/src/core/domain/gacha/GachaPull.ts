import { Title } from './Title.js';

export interface GachaPullData {
  userId: string;
  titles: Title[];
  cost: number;
  timestamp?: Date;
}

export class GachaPull {
  readonly id: string;
  readonly userId: string;
  readonly titles: Title[];
  readonly cost: number;
  readonly timestamp: Date;

  constructor(data: GachaPullData) {
    this.id = crypto.randomUUID();
    this.userId = data.userId;
    this.titles = data.titles;
    this.cost = data.cost;
    this.timestamp = data.timestamp || new Date();
  }

  static create(data: GachaPullData): GachaPull {
    return new GachaPull(data);
  }
}
