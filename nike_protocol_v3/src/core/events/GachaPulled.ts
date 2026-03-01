import { randomUUID } from 'crypto';

export class GachaPulled {
  readonly eventId: string;
  readonly type = 'GachaPulled' as const;
  
  constructor(
    public readonly discordId: string,
    public readonly titleIds: string[],
    public readonly totalCost: number,
    public readonly occurredAt: Date = new Date()
  ) {
    this.eventId = randomUUID();
  }
}
