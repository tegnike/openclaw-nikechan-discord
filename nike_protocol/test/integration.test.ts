// Integration Tests for Nike Protocol v2

import { test, expect, describe, beforeEach } from 'bun:test';
import { coinSystem } from '../src/nikecoin_v2.js';
import { gachaSystem } from '../src/gacha_v2.js';

describe('NikeCoin v2', () => {
  const TEST_USER = '123456789012345678';
  const TEST_USER_2 = '876543210987654321';

  beforeEach(() => {
    // Clean up test data if needed
  });

  test('should mint coins to user', () => {
    const tx = coinSystem.mint(TEST_USER, 1000, 'Test mint');
    
    expect(tx.amount).toBe(1000);
    expect(tx.to_did).toBe(`did:nike:discord:${TEST_USER}`);
    expect(tx.from_did).toBe('MINT');
    
    const balance = coinSystem.getBalance(TEST_USER);
    expect(balance).toBeGreaterThanOrEqual(1000);
  });
  
  test('should send coins between users', () => {
    // Setup: give sender some coins
    coinSystem.mint(TEST_USER, 500, 'Initial funds');
    
    const initialBalance = coinSystem.getBalance(TEST_USER);
    
    const tx = coinSystem.send(TEST_USER, TEST_USER_2, 100, 'Test transfer');
    
    expect(tx.amount).toBe(100);
    expect(tx.from_did).toBe(`did:nike:discord:${TEST_USER}`);
    expect(tx.to_did).toBe(`did:nike:discord:${TEST_USER_2}`);
    
    const newBalance = coinSystem.getBalance(TEST_USER);
    expect(newBalance).toBe(initialBalance - 100);
  });
  
  test('should reject insufficient balance', () => {
    expect(() => {
      coinSystem.send(TEST_USER, TEST_USER_2, 999999, 'Should fail');
    }).toThrow();
  });
  
  test('should burn coins', () => {
    coinSystem.mint(TEST_USER, 200, 'For burning');
    const beforeBurn = coinSystem.getBalance(TEST_USER);
    
    const tx = coinSystem.burn(TEST_USER, 50, 'Test burn');
    
    expect(tx.amount).toBe(50);
    expect(tx.to_did).toBe('BURN');
    
    const afterBurn = coinSystem.getBalance(TEST_USER);
    expect(afterBurn).toBe(beforeBurn - 50);
  });
  
  test('should verify transaction signatures', () => {
    const tx = coinSystem.mint(TEST_USER, 100, 'For verification');
    const isValid = coinSystem.verifyTransaction(tx);
    expect(isValid).toBe(true);
  });
  
  test('should track transaction history', () => {
    coinSystem.mint(TEST_USER, 300, 'History test');
    
    const history = coinSystem.getHistory(TEST_USER, 10);
    expect(history.length).toBeGreaterThan(0);
    
    const lastTx = history[0];
    expect(lastTx.direction).toBe('received');
    expect(lastTx.amount).toBe(300);
  });
});

describe('Gacha v2', () => {
  const TEST_USER = '111222333444555666';

  test('should have 110 titles', () => {
    const titles = gachaSystem.getAllTitles();
    expect(titles.length).toBe(110);
    
    const ss = titles.filter(t => t.rarity === 'SS');
    const s = titles.filter(t => t.rarity === 'S');
    const a = titles.filter(t => t.rarity === 'A');
    const b = titles.filter(t => t.rarity === 'B');
    const c = titles.filter(t => t.rarity === 'C');
    
    expect(ss.length).toBe(5);
    expect(s.length).toBe(10);
    expect(a.length).toBe(20);
    expect(b.length).toBe(30);
    expect(c.length).toBe(45);
  });
  
  test('should pull gacha with coin cost', () => {
    // Give user coins first
    coinSystem.mint(TEST_USER, 200, 'Gacha funds');
    
    const result = gachaSystem.pull(TEST_USER);
    
    expect(result.result.title).toBeDefined();
    expect(['SS', 'S', 'A', 'B', 'C']).toContain(result.result.title.rarity);
    expect(result.cost).toBe(100);
    expect(result.remainingBalance).toBe(100);
  });
  
  test('should do 10-pull with guarantee', () => {
    coinSystem.mint(TEST_USER, 1000, '10-pull funds');
    
    const pull = gachaSystem.pull10(TEST_USER);
    
    expect(pull.results).toHaveLength(10);
    expect(pull.cost).toBe(900);
    
    // Check at least one A+ in results (guaranteed on 10th if none before)
    const hasAPlus = pull.results.some(r => ['SS', 'S', 'A'].includes(r.title.rarity));
    expect(hasAPlus).toBe(true);
  });
  
  test('should track inventory', () => {
    coinSystem.mint(TEST_USER, 100, 'Inventory test');
    
    const result = gachaSystem.pull(TEST_USER);
    const inv = gachaSystem.getInventory(TEST_USER);
    
    expect(inv.length).toBeGreaterThanOrEqual(1);
    expect(inv[0].title_id).toBe(result.result.title.id);
    expect(inv[0].count).toBeGreaterThanOrEqual(1);
  });
  
  test('should equip and unequip titles', () => {
    coinSystem.mint(TEST_USER, 100, 'Equip test');
    
    const result = gachaSystem.pull(TEST_USER);
    const titleId = result.result.title.id;
    
    // Equip
    const equipped = gachaSystem.equipTitle(TEST_USER, titleId);
    expect(equipped).toBe(true);
    
    const current = gachaSystem.getEquippedTitle(TEST_USER);
    expect(current?.id).toBe(titleId);
    
    // Unequip
    gachaSystem.unequipTitle(TEST_USER);
    const afterUnequip = gachaSystem.getEquippedTitle(TEST_USER);
    expect(afterUnequip).toBeNull();
  });
  
  test('should reject equipping unowned titles', () => {
    const equipped = gachaSystem.equipTitle(TEST_USER, 'ss_001');
    expect(equipped).toBe(false);
  });
  
  test('should track gacha history', () => {
    coinSystem.mint(TEST_USER, 200, 'History test');
    
    gachaSystem.pull(TEST_USER);
    const history = gachaSystem.getHistory(TEST_USER, 10);
    
    expect(history.length).toBeGreaterThan(0);
    expect(['SS', 'S', 'A', 'B', 'C']).toContain(history[0].rarity);
  });
});

describe('End-to-End Flow', () => {
  test('complete user journey', () => {
    const userId = '999888777666555444';
    
    // 1. Mint initial coins
    coinSystem.mint(userId, 1000, 'Welcome bonus');
    expect(coinSystem.getBalance(userId)).toBe(1000);
    
    // 2. Do some gacha pulls
    const pull1 = gachaSystem.pull(userId);
    expect(pull1.cost).toBe(100);
    expect(coinSystem.getBalance(userId)).toBe(900);
    
    // 3. Do a 10-pull
    const pull10 = gachaSystem.pull10(userId);
    expect(pull10.cost).toBe(900);
    expect(coinSystem.getBalance(userId)).toBe(0);
    
    // 4. Check inventory
    const inventory = gachaSystem.getInventory(userId);
    expect(inventory.length).toBeGreaterThanOrEqual(1);
    
    // 5. Equip a title
    const firstTitle = inventory[0];
    gachaSystem.equipTitle(userId, firstTitle.title_id);
    const equipped = gachaSystem.getEquippedTitle(userId);
    expect(equipped?.id).toBe(firstTitle.title_id);
    
    // 6. Check transaction history
    const coinHistory = coinSystem.getHistory(userId, 20);
    expect(coinHistory.length).toBeGreaterThanOrEqual(2); // mint + gacha costs
    
    // 7. Check gacha history
    const gachaHistory = gachaSystem.getHistory(userId, 20);
    expect(gachaHistory.length).toBe(11); // 1 single + 10 ten-pull
  });
});
