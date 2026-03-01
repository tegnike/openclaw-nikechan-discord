export class UserProfile {
  constructor(
    public readonly did: string,
    public displayName: string,
    public createdAt: Date = new Date()
  ) {}
}
