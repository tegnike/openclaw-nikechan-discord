import * as fs from 'fs';
import * as path from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * 【本番移行】暗号化対応マイグレーター
 * v2暗号化DB → 復号 → 変換 → v3暗号化DB
 */
export class EncryptedMigrator {
  private readonly v2Path: string;
  private readonly v3Path: string;
  private readonly tmpPath: string;
  private readonly backupDir: string;

  constructor(private nikeDir: string, private key?: Buffer) {
    this.v2Path = path.join(nikeDir, 'coin_v2.db.enc');
    this.v3Path = path.join(nikeDir, 'coin_v3.db.enc');
    this.tmpPath = path.join(nikeDir, 'coin_v3.db.tmp');
    this.backupDir = path.join(nikeDir, 'backups');
    
    // デフォルトキー（環境変数または固定値から）
    if (!this.key) {
      const keyEnv = process.env.NIKE_COIN_KEY || 'default-key-for-development-only';
      this.key = scryptSync(keyEnv, 'salt', KEY_LENGTH);
    }
  }

  async migrate(): Promise<{ success: boolean; state: string; details?: string }> {
    const operationId = `migration_${Date.now()}`;
    
    try {
      // Phase 0: 前提条件チェック
      if (!fs.existsSync(this.v2Path)) {
        return { success: false, state: 'failed', details: 'v2 database not found' };
      }
      if (fs.existsSync(this.v3Path)) {
        return { success: true, state: 'completed', details: 'v3 already exists' };
      }

      // Phase 1: バックアップ作成
      fs.mkdirSync(this.backupDir, { recursive: true });
      const backupPath = path.join(this.backupDir, `${operationId}_v2.backup`);
      fs.copyFileSync(this.v2Path, backupPath);
      console.log(`[${operationId}] Backup created: ${backupPath}`);

      // Phase 2: v2復号
      const v2Encrypted = fs.readFileSync(this.v2Path);
      const v2Data = this.decrypt(v2Encrypted);
      console.log(`[${operationId}] v2 decrypted, accounts: ${v2Data.accounts?.length || 0}`);

      // Phase 3: データ変換
      const v3Data = this.transform(v2Data);
      console.log(`[${operationId}] Data transformed to v3`);

      // Phase 4: 一時ファイルに暗号化書き込み
      if (fs.existsSync(this.tmpPath)) {
        fs.unlinkSync(this.tmpPath);
      }
      
      const v3Encrypted = this.encrypt(v3Data);
      fs.writeFileSync(this.tmpPath, v3Encrypted);
      
      // 検証
      const verifyDecrypted = this.decrypt(fs.readFileSync(this.tmpPath));
      if (verifyDecrypted.version !== 3) {
        fs.unlinkSync(this.tmpPath);
        return { success: false, state: 'failed', details: 'Validation failed' };
      }
      console.log(`[${operationId}] Temp file validated`);

      // Phase 5: アトミックスワップ
      fs.renameSync(this.tmpPath, this.v3Path);
      console.log(`[${operationId}] ATOMIC RENAME completed`);

      return { success: true, state: 'completed', details: operationId };

    } catch (error) {
      if (fs.existsSync(this.tmpPath)) {
        fs.unlinkSync(this.tmpPath);
      }
      return { 
        success: false, 
        state: 'failed', 
        details: `${operationId}: ${(error as Error).message}` 
      };
    }
  }

  private decrypt(encrypted: Buffer): any {
    const salt = encrypted.slice(0, SALT_LENGTH);
    const iv = encrypted.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = encrypted.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encrypted.slice(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = scryptSync(this.key!, salt, KEY_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  private encrypt(data: any): Buffer {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = scryptSync(this.key!, salt, KEY_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([salt, iv, authTag, ciphertext]);
  }

  private transform(v2Data: any): any {
    return {
      version: 3,
      schema: 'nike-coin-v3',
      migratedAt: new Date().toISOString(),
      accounts: v2Data.accounts || [],
      transactions: v2Data.transactions || [],
      titles: v2Data.titles || this.generateDefaultTitles(),
      gachaInventory: v2Data.gachaInventory || {}
    };
  }

  private generateDefaultTitles(): Record<string, any> {
    // 110種類の称号データ生成
    const titles: Record<string, any> = {};
    const rarities = ['SS', 'S', 'A', 'B', 'C'];
    const counts = [5, 10, 20, 30, 45];
    
    let id = 1;
    rarities.forEach((rarity, idx) => {
      for (let i = 0; i < counts[idx]; i++) {
        titles[`title_${id}`] = {
          id: `title_${id}`,
          name: `${rarity}ランク称号 ${i + 1}`,
          rarity,
          description: `${rarity}ランクの特別な称号です`
        };
        id++;
      }
    });
    
    return titles;
  }
}
