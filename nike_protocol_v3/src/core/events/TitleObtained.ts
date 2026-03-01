import { DomainEvent } from './DomainEvent.js';
import type { UserId } from '../domain/user/UserId.js';
import type { Title } from '../domain/gacha/Title.js';

export class TitleObtained extends DomainEvent {
  readonly userId: UserId;
  readonly title: Title;
  readonly isNew: boolean;

  constructor(userId: UserId, title: Title, isNew: boolean) {
    super();
    this.userId = userId;
    this.title = title;
    this.isNew = isNew;
  }
}
