import { LegacyKeyResolver } from '../migration/LegacyKeyResolver.js';
import * as fs from 'fs';

const v2Path = process.env.HOME ? `${process.env.HOME}/.nike/coin_v2.db.enc` : '/root/.nike/coin_v2.db.enc';

async function testDecrypt() {
  const encrypted = fs.readFileSync(v2Path);
  console.log('V2 file size:', encrypted.length, 'bytes');
  console.log('First 32 bytes:', encrypted.slice(0, 32).toString('hex'));
  
  // Try different key sources
  const keysToTry = [
    { name: 'NIKE_COIN_ENCRYPTION_KEY', value: process.env.NIKE_COIN_ENCRYPTION_KEY },
    { name: 'NIKE_COIN_PASSWORD', value: process.env.NIKE_COIN_PASSWORD },
    { name: 'default-key', value: 'default-key-for-development-only' },
    { name: 'test-hex', value: 'a'.repeat(64) }
  ];
  
  for (const { name, value } of keysToTry) {
    if (!value) continue;
    
    process.env.NIKE_COIN_ENCRYPTION_KEY = value;
    delete process.env.NIKE_COIN_PASSWORD;
    
    const result = LegacyKeyResolver.resolveV2();
    console.log(`\n${name}:`, result.success ? '✓ Key resolved' : '✗ Failed', result.source);
    
    if (result.key) {
      const valid = await LegacyKeyResolver.verifyKey(result.key, encrypted);
      console.log('  Can decrypt:', valid ? '✓ YES' : '✗ NO');
    }
  }
}

testDecrypt().catch(console.error);
