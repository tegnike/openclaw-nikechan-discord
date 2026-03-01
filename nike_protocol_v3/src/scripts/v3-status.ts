import * as fs from 'fs';
import * as path from 'path';
import { scryptSync, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

const nikeDir = process.env.HOME ? `${process.env.HOME}/.nike` : '/root/.nike';
const v3Path = path.join(nikeDir, 'coin_v3.db.enc');

const keyEnv = process.env.NIKE_COIN_ENCRYPTION_KEY || 'a'.repeat(64);
const key = Buffer.from(keyEnv, 'hex').length === KEY_LENGTH 
  ? Buffer.from(keyEnv, 'hex')
  : scryptSync(keyEnv, 'salt', KEY_LENGTH);

function decrypt(encrypted: Buffer): any {
  const salt = encrypted.slice(0, SALT_LENGTH);
  const iv = encrypted.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encrypted.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encrypted.slice(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const derivedKey = scryptSync(key, salt, KEY_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Nike Protocol v3 - Status Report                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (!fs.existsSync(v3Path)) {
  console.error('❌ v3 database not found');
  process.exit(1);
}

try {
  const encrypted = fs.readFileSync(v3Path);
  const data = decrypt(encrypted);
  
  console.log('📊 Database Status:');
  console.log(`   Version: ${data.version}`);
  console.log(`   Schema: ${data.schema}`);
  console.log(`   Created: ${data.createdAt}`);
  if (data.migratedFrom) {
    console.log(`   Migrated from: ${data.migratedFrom}`);
  }
  
  console.log('\n👥 Accounts:');
  console.log(`   Total accounts: ${data.accounts?.length || 0}`);
  if (data.accounts?.length > 0) {
    data.accounts.forEach((acc: any) => {
      console.log(`   - ${acc.did}: ${acc.balance} coins`);
    });
  } else {
    console.log('   (No accounts yet)');
  }
  
  console.log('\n💰 Transactions:');
  console.log(`   Total transactions: ${data.transactions?.length || 0}`);
  
  console.log('\n🏆 Titles (110 types):');
  const titles = data.titles || {};
  const byRarity: Record<string, number> = { SS: 0, S: 0, A: 0, B: 0, C: 0 };
  Object.values(titles).forEach((t: any) => {
    byRarity[t.rarity] = (byRarity[t.rarity] || 0) + 1;
  });
  
  console.log(`   SS Rank: ${byRarity.SS} titles`);
  console.log(`   S Rank: ${byRarity.S} titles`);
  console.log(`   A Rank: ${byRarity.A} titles`);
  console.log(`   B Rank: ${byRarity.B} titles`);
  console.log(`   C Rank: ${byRarity.C} titles`);
  console.log(`   Total: ${Object.keys(titles).length} titles`);
  
  console.log('\n🎲 Gacha Inventory:');
  const inventory = data.gachaInventory || {};
  console.log(`   Entries: ${Object.keys(inventory).length}`);
  
  console.log('\n✅ Verification:');
  console.log(`   Database integrity: OK`);
  console.log(`   Encryption: AES-256-GCM`);
  console.log(`   File size: ${encrypted.length} bytes`);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Nike Protocol v3: 正常稼働中');
  console.log('═══════════════════════════════════════════════════════════════');
  
} catch (e) {
  console.error('❌ Failed to read v3 database:', (e as Error).message);
  process.exit(1);
}
