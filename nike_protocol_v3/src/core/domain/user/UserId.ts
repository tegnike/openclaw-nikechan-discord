import { ok, err, type Result } from 'neverthrow';

export class UserId {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): Result<UserId, Error> {
    if (!value || value.length === 0) {
      return err(new Error('UserId cannot be empty'));
    }
    if (value.length > 100) {
      return err(new Error('UserId too long'));
    }
    return ok(new UserId(value));
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
