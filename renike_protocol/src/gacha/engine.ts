// ============================================
// ReNikeProtocol - Gacha Engine
// ============================================

import { Title, Rarity, GachaResult } from '../core/types.js';
import { TITLES, DROP_RATES } from './titles.js';

export class GachaEngine {
  private rng: () => number;

  constructor(seed?: number) {
    // Deterministic RNG for testing if seed provided
    if (seed !== undefined) {
      let s = seed;
      this.rng = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    } else {
      this.rng = Math.random;
    }
  }

  /**
   * Draw a single title based on drop rates
   */
  drawOne(): Title {
    const rand = this.rng();
    let cumulative = 0;

    for (const [rarity, rate] of Object.entries(DROP_RATES)) {
      cumulative += rate;
      if (rand < cumulative) {
        const pool = TITLES.filter(t => t.rarity === rarity);
        return pool[Math.floor(this.rng() * pool.length)];
      }
    }

    // Fallback to lowest rarity
    const cPool = TITLES.filter(t => t.rarity === 'C');
    return cPool[Math.floor(this.rng() * cPool.length)];
  }

  /**
   * Draw n titles with pity system
   * - Every 10th pull guarantees A or higher if no A+ in previous 9
   */
  draw(count: number, existingIds: string[] = []): Array<{ title: Title; isNew: boolean }> {
    const results: Array<{ title: Title; isNew: boolean }> = [];
    let lastAPlusIndex = -1;

    for (let i = 0; i < count; i++) {
      const isTenthPull = (i + 1) % 10 === 0;
      const hasAPlusInLastNine = lastAPlusIndex >= i - 9;

      let title: Title;

      if (isTenthPull && !hasAPlusInLastNine) {
        // Pity: Force A or higher
        const pityRand = this.rng();
        let pityCumulative = 0;
        const pityRates: Record<Rarity, number> = {
          SS: 0.01 / 0.14,  // Normalized to A+ pool
          S: 0.03 / 0.14,
          A: 0.10 / 0.14,
          B: 0,
          C: 0
        };

        for (const [rarity, rate] of Object.entries(pityRates)) {
          if (rate === 0) continue;
          pityCumulative += rate;
          if (pityRand < pityCumulative) {
            const pool = TITLES.filter(t => t.rarity === rarity);
            title = pool[Math.floor(this.rng() * pool.length)];
            break;
          }
        }
        title ??= TITLES.find(t => t.rarity === 'A')!;
      } else {
        title = this.drawOne();
      }

      if (['SS', 'S', 'A'].includes(title.rarity)) {
        lastAPlusIndex = i;
      }

      const isNew = !existingIds.includes(title.id);
      results.push({ title, isNew });
    }

    return results;
  }

  /**
   * Calculate expected value statistics
   */
  static getStatistics(): {
    totalTitles: number;
    byRarity: Record<Rarity, { count: number; rate: number }>;
    expectedCostForSS: number;
  } {
    const byRarity = {} as Record<Rarity, { count: number; rate: number }>;

    for (const rarity of ['SS', 'S', 'A', 'B', 'C'] as Rarity[]) {
      const count = TITLES.filter(t => t.rarity === rarity).length;
      byRarity[rarity] = {
        count,
        rate: DROP_RATES[rarity]
      };
    }

    return {
      totalTitles: TITLES.length,
      byRarity,
      expectedCostForSS: Math.ceil(100 / DROP_RATES.SS) * 100 // 100 coins per 10-pull
    };
  }
}
