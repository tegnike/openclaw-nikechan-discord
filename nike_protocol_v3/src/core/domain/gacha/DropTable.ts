import { Title, Rarity } from './Title.js';

export class DropTable {
  private titles: Title[] = [];

  static createStandard(): DropTable {
    const table = new DropTable();
    
    // SS (1%)
    table.addTitle(new Title('ss_001', '伝説のニケ', 'SS'));
    table.addTitle(new Title('ss_002', '神話の始まり', 'SS'));
    table.addTitle(new Title('ss_003', '創世の一撃', 'SS'));
    table.addTitle(new Title('ss_004', '永遠の誓い', 'SS'));
    table.addTitle(new Title('ss_005', '運命の出会い', 'SS'));
    
    // S (3%)
    for (let i = 1; i <= 10; i++) {
      table.addTitle(new Title(`s_${String(i).padStart(3, '0')}`, `Sレア称号${i}`, 'S'));
    }
    
    // A (10%)
    for (let i = 1; i <= 20; i++) {
      table.addTitle(new Title(`a_${String(i).padStart(3, '0')}`, `Aレア称号${i}`, 'A'));
    }
    
    // B (26%)
    for (let i = 1; i <= 30; i++) {
      table.addTitle(new Title(`b_${String(i).padStart(3, '0')}`, `Bレア称号${i}`, 'B'));
    }
    
    // C (60%)
    for (let i = 1; i <= 40; i++) {
      table.addTitle(new Title(`c_${String(i).padStart(3, '0')}`, `Cレア称号${i}`, 'C'));
    }
    
    return table;
  }

  private addTitle(title: Title): void {
    this.titles.push(title);
  }

  drawSingle(): Title {
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    for (const title of this.titles) {
      cumulative += this.getProbability(title.rarity);
      if (rand <= cumulative) {
        return title;
      }
    }
    
    return this.titles[this.titles.length - 1];
  }

  drawTen(): Title[] {
    const results: Title[] = [];
    let hasAOrAbove = false;
    
    for (let i = 0; i < 9; i++) {
      const title = this.drawSingle();
      results.push(title);
      if (['SS', 'S', 'A'].includes(title.rarity)) {
        hasAOrAbove = true;
      }
    }
    
    // 10th pull guarantee
    if (!hasAOrAbove) {
      const aTitles = this.titles.filter(t => t.rarity === 'A');
      results.push(aTitles[Math.floor(Math.random() * aTitles.length)]);
    } else {
      results.push(this.drawSingle());
    }
    
    return results;
  }

  private getProbability(rarity: Rarity): number {
    switch (rarity) {
      case 'SS': return 1;
      case 'S': return 0.3;
      case 'A': return 0.5;
      case 'B': return 0.87;
      case 'C': return 1.5;
      default: return 1;
    }
  }
}
