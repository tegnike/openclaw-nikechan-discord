export interface TitleData {
  id: string;
  name: string;
  rarity: 'SS' | 'S' | 'A' | 'B' | 'C';
  description?: string;
}

export class Title {
  readonly id: string;
  readonly name: string;
  readonly rarity: 'SS' | 'S' | 'A' | 'B' | 'C';
  readonly description?: string;

  constructor(data: TitleData) {
    this.id = data.id;
    this.name = data.name;
    this.rarity = data.rarity;
    this.description = data.description;
  }

  static create(data: TitleData): Title {
    return new Title(data);
  }
}
