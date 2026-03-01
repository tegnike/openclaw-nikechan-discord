import { describe, it, expect } from 'vitest';
import { Coin } from '../../../../../core/domain/coin/Coin.js';

describe('Coin Value Object', () => {
  describe('正常系: 有効な値で作成', () => {
    it('0コインを作成できる', () => {
      const result = Coin.create(0);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.amount).toBe(0);
      }
    });

    it('正の整数コインを作成できる', () => {
      const result = Coin.create(100);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.amount).toBe(100);
      }
    });

    it('最大値(1,000,000,000)まで作成できる', () => {
      const result = Coin.create(1000000000);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.amount).toBe(1000000000);
      }
    });
  });

  describe('異常系: 無効な値は拒否', () => {
    it('負の数はエラー', () => {
      const result = Coin.create(-1);
      expect(result.isErr()).toBe(true);
    });

    it('小数はエラー', () => {
      const result = Coin.create(10.5);
      expect(result.isErr()).toBe(true);
    });

    it('最大値超過はエラー', () => {
      const result = Coin.create(1000000001);
      expect(result.isErr()).toBe(true);
    });

    it('NaNはエラー', () => {
      const result = Coin.create(NaN);
      expect(result.isErr()).toBe(true);
    });

    it('Infinityはエラー', () => {
      const result = Coin.create(Infinity);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('演算: add()', () => {
    it('同じ金額を加算できる', () => {
      const coin1 = Coin.create(100)._unsafeUnwrap();
      const coin2 = Coin.create(50)._unsafeUnwrap();
      const result = coin1.add(coin2);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.amount).toBe(150);
      }
    });

    it('オーバーフロー時はエラー', () => {
      const coin1 = Coin.create(900000000)._unsafeUnwrap();
      const coin2 = Coin.create(200000000)._unsafeUnwrap();
      const result = coin1.add(coin2);
      
      expect(result.isErr()).toBe(true);
    });

    it('元のオブジェクトは不変', () => {
      const coin1 = Coin.create(100)._unsafeUnwrap();
      const coin2 = Coin.create(50)._unsafeUnwrap();
      coin1.add(coin2);
      
      expect(coin1.amount).toBe(100);
    });
  });

  describe('演算: subtract()', () => {
    it('減算できる', () => {
      const coin1 = Coin.create(100)._unsafeUnwrap();
      const coin2 = Coin.create(30)._unsafeUnwrap();
      const result = coin1.subtract(coin2);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.amount).toBe(70);
      }
    });

    it('マイナスになる減算はエラー', () => {
      const coin1 = Coin.create(50)._unsafeUnwrap();
      const coin2 = Coin.create(100)._unsafeUnwrap();
      const result = coin1.subtract(coin2);
      
      expect(result.isErr()).toBe(true);
    });
  });

  describe('比較メソッド', () => {
    const coin100 = Coin.create(100)._unsafeUnwrap();
    const coin50 = Coin.create(50)._unsafeUnwrap();
    const coin100again = Coin.create(100)._unsafeUnwrap();

    it('equals(): 同じ値はtrue', () => {
      expect(coin100.equals(coin100again)).toBe(true);
    });

    it('equals(): 異なる値はfalse', () => {
      expect(coin100.equals(coin50)).toBe(false);
    });

    it('greaterThan(): 大きい方がtrue', () => {
      expect(coin100.greaterThan(coin50)).toBe(true);
      expect(coin50.greaterThan(coin100)).toBe(false);
    });

    it('lessThan(): 小さい方がtrue', () => {
      expect(coin50.lessThan(coin100)).toBe(true);
      expect(coin100.lessThan(coin50)).toBe(false);
    });

    it('isZero(): 0のみtrue', () => {
      const zero = Coin.create(0)._unsafeUnwrap();
      expect(zero.isZero()).toBe(true);
      expect(coin50.isZero()).toBe(false);
    });
  });

  describe('不変性: Object.freeze()', () => {
    it('作成後にamountを変更できない', () => {
      const coin = Coin.create(100)._unsafeUnwrap();
      
      expect(() => {
        (coin as any).amount = 200;
      }).toThrow();
      
      expect(coin.amount).toBe(100);
    });

    it('freezeされていることを確認', () => {
      const coin = Coin.create(100)._unsafeUnwrap();
      expect(Object.isFrozen(coin)).toBe(true);
    });
  });
});
