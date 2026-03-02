import { Title } from './Title.js';

export class DropTable {
  private titles: Title[];

  constructor(titles: Title[]) {
    this.titles = titles;
  }

  static createDefault(): DropTable {
    const titles: Title[] = [];
    
    // SS (5種) - 1%
    const ssNames = ['伝説の勇者', '神々しい存在', '世界を救いし者', '時空を超えし者', '永遠の守護者'];
    for (let i = 1; i <= 5; i++) {
      titles.push(new Title({
        id: `ss_${i}`,
        name: ssNames[i-1],
        rarity: 'SS',
        description: `SSランク称号 #${i}`
      }));
    }
    
    // S (10種) - 3%
    for (let i = 1; i <= 10; i++) {
      titles.push(new Title({
        id: `s_${i}`,
        name: `Sランク称号 ${i}`,
        rarity: 'S',
        description: `Sランク称号 #${i}`
      }));
    }
    
    // A (20種) - 10%
    for (let i = 1; i <= 20; i++) {
      titles.push(new Title({
        id: `a_${i}`,
        name: `Aランク称号 ${i}`,
        rarity: 'A',
        description: `Aランク称号 #${i}`
      }));
    }
    
    // B (30種) - 26%
    for (let i = 1; i <= 30; i++) {
      titles.push(new Title({
        id: `b_${i}`,
        name: `Bランク称号 ${i}`,
        rarity: 'B',
        description: `Bランク称号 #${i}`
      }));
    }
    
    // C (40種) - 60%
    for (let i = 1; i <= 40; i++) {
      titles.push(new Title({
        id: `c_${i}`,
        name: `Cランク称号 ${i}`,
        rarity: 'C',
        description: `Cランク称号 #${i}`
      }));
    }
    
    return new DropTable(titles);
  }

  draw(): Title {
    const rand = Math.random() * 100;
    let rarity: 'SS' | 'S' | 'A' | 'B' | 'C';
    
    if (rand < 1) rarity = 'SS';
    else if (rand < 4) rarity = 'S';
    else if (rand < 14) rarity = 'A';
    else if (rand < 40) rarity = 'B';
    else rarity = 'C';
    
    const pool = this.titles.filter(t => t.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  drawTen(): Title[] {
    const results: Title[] = [];
    let hasAOrAbove = false;
    
    // First 9 pulls
    for (let i = 0; i < 9; i++) {
      const title = this.draw();
      if (title.rarity === 'A' || title.rarity === 'S' || title.rarity === 'SS') {
        hasAOrAbove = true;
      }
      results.push(title);
    }
    
    // 10th pull - guarantee A or above if none in first 9
    if (!hasAOrAbove) {
      const guaranteedPool = this.titles.filter(t => 
        t.rarity === 'A' || t.rarity === 'S' || t.rarity === 'SS'
      );
      results.push(guaranteedPool[Math.floor(Math.random() * guaranteedPool.length)]);
    } else {
      results.push(this.draw());
    }
    
    return results;
  }
}
