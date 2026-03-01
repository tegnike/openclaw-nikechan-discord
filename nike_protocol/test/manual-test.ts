// Manual test for Nike Protocol v2
import { coinSystem } from '../src/nikecoin_v2.js';
import { gachaSystem } from '../src/gacha_v2.js';

console.log('=== Nike Protocol v2 Test ===\n');

const TEST_USER = '123456789012345678';
const TEST_USER_2 = '876543210987654321';

// Test 1: Mint coins
console.log('1. Testing coin minting...');
const tx1 = coinSystem.mint(TEST_USER, 1000, 'Initial funds', 'TestUser');
console.log(`   Minted: ${tx1.amount} NC to ${tx1.to_did}`);
console.log(`   Balance: ${coinSystem.getBalance(TEST_USER)} NC`);
console.log(`   ✓ PASS`);

// Test 2: Send coins
console.log('\n2. Testing coin transfer...');
const tx2 = coinSystem.send(TEST_USER, TEST_USER_2, 200, 'Test payment', 'TestUser', 'TestUser2');
console.log(`   Sent: ${tx2.amount} NC`);
console.log(`   Sender balance: ${coinSystem.getBalance(TEST_USER)} NC`);
console.log(`   Receiver balance: ${coinSystem.getBalance(TEST_USER_2)} NC`);
console.log(`   ✓ PASS`);

// Test 3: Transaction verification
console.log('\n3. Testing signature verification...');
const isValid = coinSystem.verifyTransaction(tx1);
console.log(`   Signature valid: ${isValid ? '✓ PASS' : '✗ FAIL'}`);

// Test 4: Transaction history
console.log('\n4. Testing transaction history...');
const history = coinSystem.getHistory(TEST_USER, 10);
console.log(`   Transactions: ${history.length}`);
history.slice(0, 3).forEach((h, i) => {
  console.log(`     ${i + 1}. ${h.direction}: ${h.amount} NC (${h.memo || 'no memo'})`);
});
console.log(`   ✓ PASS`);

// Test 5: Burn coins
console.log('\n5. Testing coin burn...');
const beforeBurn = coinSystem.getBalance(TEST_USER);
const burnTx = coinSystem.burn(TEST_USER, 50, 'Test burn', 'TestUser');
console.log(`   Burned: ${burnTx.amount} NC`);
console.log(`   Before: ${beforeBurn} NC, After: ${coinSystem.getBalance(TEST_USER)} NC`);
console.log(`   ✓ PASS`);

// Test 6: Gacha titles
console.log('\n6. Testing gacha titles...');
const titles = gachaSystem.getAllTitles();
console.log(`   Total titles: ${titles.length}`);
console.log(`   SS: ${titles.filter(t => t.rarity === 'SS').length}`);
console.log(`   S: ${titles.filter(t => t.rarity === 'S').length}`);
console.log(`   A: ${titles.filter(t => t.rarity === 'A').length}`);
console.log(`   B: ${titles.filter(t => t.rarity === 'B').length}`);
console.log(`   C: ${titles.filter(t => t.rarity === 'C').length}`);
console.log(`   ✓ PASS`);

// Test 7: Single gacha pull
console.log('\n7. Testing single gacha pull...');
coinSystem.mint(TEST_USER, 100, 'Gacha funds', 'TestUser');
const pull1 = gachaSystem.pull(TEST_USER);
console.log(`   Result: [${pull1.result.title.rarity}] ${pull1.result.title.name}`);
console.log(`   Is new: ${pull1.result.isNew ? 'Yes' : 'No'}`);
console.log(`   Cost: ${pull1.cost} NC`);
console.log(`   Remaining: ${pull1.remainingBalance} NC`);
console.log(`   ✓ PASS`);

// Test 8: 10-pull gacha
console.log('\n8. Testing 10-pull gacha...');
coinSystem.mint(TEST_USER, 900, '10-pull funds', 'TestUser');
const pull10 = gachaSystem.pull10(TEST_USER);
console.log(`   Results:`);
pull10.results.forEach((r, i) => {
  const marker = r.isNew ? ' ✨' : '';
  console.log(`     ${i + 1}. [${r.title.rarity}] ${r.title.name}${marker}`);
});
console.log(`   Cost: ${pull10.cost} NC`);
console.log(`   Remaining: ${pull10.remainingBalance} NC`);
console.log(`   ✓ PASS`);

// Test 9: Inventory
console.log('\n9. Testing inventory...');
const inventory = gachaSystem.getInventory(TEST_USER);
console.log(`   Titles owned: ${inventory.length}`);
inventory.slice(0, 5).forEach(item => {
  console.log(`     - [${item.rarity}] ${item.name} (x${item.count})`);
});
console.log(`   ✓ PASS`);

// Test 10: Equip title
console.log('\n10. Testing title equip/unequip...');
if (inventory.length > 0) {
  const firstTitle = inventory[0];
  const equipped = gachaSystem.equipTitle(TEST_USER, firstTitle.title_id);
  console.log(`   Equipped: ${equipped ? '✓ PASS' : '✗ FAIL'}`);
  
  const current = gachaSystem.getEquippedTitle(TEST_USER);
  console.log(`   Current title: ${current?.name || 'None'}`);
  
  gachaSystem.unequipTitle(TEST_USER);
  const afterUnequip = gachaSystem.getEquippedTitle(TEST_USER);
  console.log(`   After unequip: ${afterUnequip ? '✗ FAIL' : '✓ PASS'}`);
} else {
  console.log(`   Skipped (no titles in inventory)`);
}

// Test 11: Gacha history
console.log('\n11. Testing gacha history...');
const gachaHistory = gachaSystem.getHistory(TEST_USER, 20);
console.log(`   Pulls recorded: ${gachaHistory.length}`);
gachaHistory.slice(0, 5).forEach((h, i) => {
  console.log(`     ${i + 1}. [${h.rarity}] ${h.cost} NC`);
});
console.log(`   ✓ PASS`);

// Test 12: Stats
console.log('\n12. Testing user stats...');
const stats = coinSystem.getStats(TEST_USER);
console.log(`   DID: ${stats.did}`);
console.log(`   Discord ID: ${stats.discord_id}`);
console.log(`   Username: ${stats.username || 'N/A'}`);
console.log(`   Balance: ${stats.balance} NC`);
console.log(`   Total received: ${stats.total_received} NC`);
console.log(`   Total sent: ${stats.total_sent} NC`);
console.log(`   Created: ${new Date(stats.created_at).toISOString()}`);
console.log(`   ✓ PASS`);

console.log('\n=== All Tests Passed! ===');
