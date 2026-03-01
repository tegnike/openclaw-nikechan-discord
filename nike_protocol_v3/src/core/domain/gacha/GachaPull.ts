import { Title } from './Title.js';

export class GachaPull {
  readonly title: Title;
  readonly isNew: boolean;
  readonly pulledAt: Date;

  constructor(title: Title, isNew: boolean, pulledAt: Date = new Date()) {
    this.title = title;
    this.isNew = isNew;
    this.pulledAt = pulledAt;
    Object.freeze(this);
  }
}
