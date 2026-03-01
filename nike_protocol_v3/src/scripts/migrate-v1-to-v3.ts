import * as fs from 'fs';
import * as path from 'path';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

const nikeDir = process.env.HOME ? `${process.env.HOME}/.nike` : '/root/.nike';
const v1Path = path.join(nikeDir, 'coin_v2.json');
const v3Path = path.join(nikeDir, 'coin_v3.db.enc');

// キー取得
const keyEnv = process.env.NIKE_COIN_ENCRYPTION_KEY || 'a'.repeat(64);
const key = Buffer.from(keyEnv, 'hex').length === KEY_LENGTH 
  ? Buffer.from(keyEnv, 'hex')
  : scryptSync(keyEnv, 'salt', KEY_LENGTH);

function encrypt(data: any): Buffer {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const derivedKey = scryptSync(key, salt, KEY_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([salt, iv, authTag, ciphertext]);
}

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
console.log('║     Nike Protocol v3 - v1 to v3 Migration                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// v1データ読み込み
if (!fs.existsSync(v1Path)) {
  console.error('❌ v1 data (coin_v2.json) not found');
  process.exit(1);
}

const v1Data = JSON.parse(fs.readFileSync(v1Path, 'utf8'));
const accounts = Object.values(v1Data);

console.log('📦 v1 Data Loaded:');
console.log(`   Accounts: ${accounts.length}`);

let totalBalance = 0;
accounts.forEach((acc: any) => {
  console.log(`   - ${acc.discordId}: ${acc.balance} coins`);
  totalBalance += acc.balance;
});
console.log(`   Total balance: ${totalBalance} coins\n`);

// 既存のv3データを読み込み（称号データを保持）
let titles: Record<string, any> = {};
if (fs.existsSync(v3Path)) {
  try {
    const v3Encrypted = fs.readFileSync(v3Path);
    const v3Data = decrypt(v3Encrypted);
    titles = v3Data.titles || {};
    console.log(`📋 Preserved ${Object.keys(titles).length} titles from existing v3\n`);
  } catch (e) {
    console.log('⚠️  Could not read existing v3, creating fresh\n');
  }
}

// 称号データがない場合は生成
if (Object.keys(titles).length === 0) {
  const rarities = ['SS', 'S', 'A', 'B', 'C'];
  const counts = [5, 10, 20, 30, 45];
  let id = 1;
  rarities.forEach((rarity, idx) => {
    for (let i = 0; i < counts[idx]; i++) {
      titles[`title_${id}`] = {
        id: `title_${id}`,
        name: `${rarity}ランク称号 ${i + 1}`,
        rarity,
        description: `${rarity}ランクの特別な称号です`,
        createdAt: new Date().toISOString()
      };
      id++;
    }
  });
}

// v3形式に変換
const transactions: any[] = [];
const v3Accounts = accounts.map((acc: any) => {
  // トランザクションを収集
  if (acc.transactions) {
    acc.transactions.forEach((tx: any) => {
      transactions.push({
        id: tx.id,
        type: tx.from === 'SYSTEM' ? 'mint' : 'transfer',
        fromDid: tx.from === 'SYSTEM' ? null : tx.from,
        toDid: tx.to,
        amount: tx.amount,
        timestamp: new Date(tx.timestamp).toISOString(),
        signature: tx.signature,
        memo: tx.memo,
        status: 'confirmed'
      });
    });
  }
  
  return {
    did: acc.did,
    discordId: acc.discordId,
    balance: acc.balance,
    totalReceived: acc.totalReceived || 0,
    totalSent: acc.totalSent || 0,
    createdAt: new Date(acc.createdAt).toISOString(),
    updatedAt: new Date(acc.updatedAt).toISOString()
  };
});

// v3データ構造
const v3Data = {
  version: 3,
  schema: 'nike-coin-v3',
  migratedAt: new Date().toISOString(),
  migratedFrom: 'v1',
  sourceFile: 'coin_v2.json',
  accounts: v3Accounts,
  transactions: transactions,
  titles: titles,
  gachaInventory: {},
  metadata: {
    totalTitles: Object.keys(titles).length,
    titleRarities: { SS: 5, S: 10, A: 20, B: 30, C: 45 },
    migrationStats: {
      accountsMigrated: accounts.length,
      transactionsMigrated: transactions.length,
      totalBalance: totalBalance
    }
  }
};

// バックアップ作成
const backupDir = path.join(nikeDir, 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(v1Path, path.join(backupDir, `v1_backup_${timestamp}.json`));
console.log(`💾 v1 backed up to backups/v1_backup_${timestamp}.json\n`);

// v3書き込み
console.log('🔐 Encrypting and writing v3 database...');
const encrypted = encrypt(v3Data);
fs.writeFileSync(v3Path, encrypted);

console.log('\n✅ Migration completed!');
console.log(`   Accounts: ${v3Accounts.length}`);
console.log(`   Transactions: ${transactions.length}`);
console.log(`   Titles: ${Object.keys(titles).length}`);
console.log(`   Total balance preserved: ${totalBalance} coins`);
console.log(`   File size: ${encrypted.length} bytes`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Nike Protocol v3: v1価値移行完了');
console.log('═══════════════════════════════════════════════════════════════');
