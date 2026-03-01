export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
