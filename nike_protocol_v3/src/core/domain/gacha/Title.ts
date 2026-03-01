export type Rarity = 'SS' | 'S' | 'A' | 'B' | 'C';

export class Title {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly rarity: Rarity
  ) {}
}
