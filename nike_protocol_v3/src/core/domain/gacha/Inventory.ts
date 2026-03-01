export class Inventory {
  private constructor(private _titleIds: string[]) {}

  static create(titleIds: string[] = []): Inventory {
    return new Inventory([...titleIds]);
  }

  hasTitle(titleId: string): boolean {
    return this._titleIds.includes(titleId);
  }

  addTitle(title: { id: string }): Inventory {
    if (this.hasTitle(title.id)) {
      return this;
    }
    return new Inventory([...this._titleIds, title.id]);
  }

  get titleIds(): readonly string[] {
    return this._titleIds;
  }
}
