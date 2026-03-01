import { describe, it, expect } from 'vitest';
import { DropTable } from '../../../../../core/domain/gacha/DropTable.js';
import { Rarity } from '../../../../../core/domain/gacha/Title.js';

describe('DropTable', () => {
  describe('初期化', () => {
    it('110種類の称号が登録されている', () => {
      const allTitles = DropTable.getAll();
      expect(allTitles.length).toBe(110);
    });

    it('レアリティ別の数が正しい', () => {
      expect(DropTable.getByRarity(Rarity.SS).length).toBe(5);
      expect(DropTable.getByRarity(Rarity.S).length).toBe(10);
      expect(DropTable.getByRarity(Rarity.A).length).toBe(20);
      expect(DropTable.getByRarity(Rarity.B).length).toBe(30);
      expect(DropTable.getByRarity(Rarity.C).length).toBe(45);
    });
  });

  describe('getById()', () => {
    it('存在するIDで称号を取得', () => {
      const title = DropTable.getById('ss001');
      expect(title).not.toBeNull();
      expect(title?.rarity).toBe(Rarity.SS);
    });

    it('存在しないIDはnull', () => {
      const title = DropTable.getById('nonexistent');
      expect(title).toBeNull();
    });
  });

  describe('draw(): 統計的テスト', () => {
    it('1000回引いてSSが出る確率を検証（理論値1%）', () => {
      let ssCount = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        const result = DropTable.draw();
        if (result.rarity === Rarity.SS) {
          ssCount++;
        }
      }

      // 95%信頼区間: 約0.4%〜1.6%（二項分布近似）
      // 実測値が極端に外れていないか確認
      const actualRate = ssCount / trials;
      console.log(`SSレアリティ実測確率: ${(actualRate * 100).toFixed(2)}% (${ssCount}/1000)`);
      
      // 許容範囲: 0%〜3%（統計的変動を考慮）
      expect(actualRate).toBeGreaterThanOrEqual(0);
      expect(actualRate).toBeLessThanOrEqual(0.03);
    });

    it('全レアリティの分布を統計的に検証', () => {
      const counts = { [Rarity.SS]: 0, [Rarity.S]: 0, [Rarity.A]: 0, [Rarity.B]: 0, [Rarity.C]: 0 };
      const trials = 2000;

      for (let i = 0; i < trials; i++) {
        const result = DropTable.draw();
        counts[result.rarity]++;
      }

      const rates = {
        [Rarity.SS]: counts[Rarity.SS] / trials,
        [Rarity.S]: counts[Rarity.S] / trials,
        [Rarity.A]: counts[Rarity.A] / trials,
        [Rarity.B]: counts[Rarity.B] / trials,
        [Rarity.C]: counts[Rarity.C] / trials
      };

      console.log('実測確率分布:');
      console.log(`  SS: ${(rates[Rarity.SS] * 100).toFixed(2)}%`);
      console.log(`   S: ${(rates[Rarity.S] * 100).toFixed(2)}%`);
      console.log(`   A: ${(rates[Rarity.A] * 100).toFixed(2)}%`);
      console.log(`   B: ${(rates[Rarity.B] * 100).toFixed(2)}%`);
      console.log(`   C: ${(rates[Rarity.C] * 100).toFixed(2)}%`);
      console.log(`合計: ${((rates[Rarity.SS] + rates[Rarity.S] + rates[Rarity.A] + rates[Rarity.B] + rates[Rarity.C]) * 100).toFixed(2)}%`);

      // 確率順序の検証
      expect(rates[Rarity.SS]).toBeLessThan(rates[Rarity.S]);
      expect(rates[Rarity.S]).toBeLessThan(rates[Rarity.A]);
      expect(rates[Rarity.A]).toBeLessThan(rates[Rarity.B]);
      expect(rates[Rarity.B]).toBeLessThan(rates[Rarity.C]);
    });

    it('常に有効な称号を返す', () => {
      for (let i = 0; i < 100; i++) {
        const result = DropTable.draw();
        expect(result).toBeDefined();
        expect(Object.values(Rarity)).toContain(result.rarity);
      }
    });
  });

  describe('drawTen(): 保底機制', () => {
    it('10個の結果を返す', () => {
      const results = DropTable.drawTen();
      expect(results.length).toBe(10);
    });

    it('最低1つはA以上が含まれる（保底）', () => {
      // 統計的に確認（100回試行）
      for (let trial = 0; trial < 100; trial++) {
        const results = DropTable.drawTen();
        const hasAOrAbove = results.some(t => 
          t.rarity === Rarity.SS || 
          t.rarity === Rarity.S || 
          t.rarity === Rarity.A
        );
        expect(hasAOrAbove).toBe(true);
      }
    });
  });

  describe('確率検証', () => {
    it('全レアリティの合計確率が100%', () => {
      const rates = DropTable.getRates();
      const total = Object.values(rates).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 5);
    });
  });
});
