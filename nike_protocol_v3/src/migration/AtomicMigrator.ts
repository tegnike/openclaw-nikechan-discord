import * as fs from 'fs';
import * as path from 'path';

/**
 * 【防衛プロトコル】アトミックマイグレーション
 * 
 * 原則: v2.db → v3.db.tmp（書き込み）→ fs.rename() → v3.db（アトミック置換）
 * 
 * クラッシュ耐性:
 * - フェーズ1-3中: v2無傷、v3.tmp存在（破棄可能）
 * - rename()実行中: OSが保証するアトミック性
 * - rename()完了後: v3完成、v2削除済み
 */
export class AtomicMigrator {
  private readonly v2Path: string;
  private readonly v3Path: string;
  private readonly tmpPath: string;
  private readonly backupDir: string;

  constructor(private nikeDir: string) {
    this.v2Path = path.join(nikeDir, 'coin_v2.db.enc');
    this.v3Path = path.join(nikeDir, 'coin_v3.db.enc');
    this.tmpPath = path.join(nikeDir, 'coin_v3.db.tmp');
    this.backupDir = path.join(nikeDir, 'backups');
  }

  /**
   * アトミックマイグレーション実行
   * @returns {Promise<{success: boolean, state: 'completed' | 'rolled_back' | 'failed'}>}
   */
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

      // Phase 1: バックアップ作成（失敗しても元データは無傷）
      fs.mkdirSync(this.backupDir, { recursive: true });
      const backupPath = path.join(this.backupDir, `${operationId}_v2.backup`);
      fs.copyFileSync(this.v2Path, backupPath);
      console.log(`[${operationId}] Backup created: ${backupPath}`);

      // Phase 2: データ変換（メモリ上で完結）
      const v2Data = JSON.parse(fs.readFileSync(this.v2Path, 'utf8'));
      const v3Data = this.transform(v2Data);
      console.log(`[${operationId}] Data transformed`);

      // Phase 3: 一時ファイルへの書き込み（検証付き）
      // 既存のtmpがあれば先に削除（前回のクラッシュ残骸）
      if (fs.existsSync(this.tmpPath)) {
        fs.unlinkSync(this.tmpPath);
        console.log(`[${operationId}] Cleaned up previous tmp file`);
      }
      
      fs.writeFileSync(this.tmpPath, JSON.stringify(v3Data));
      
      // 検証: 書き込みが完全かチェック
      const written = fs.readFileSync(this.tmpPath, 'utf8');
      const parsed = JSON.parse(written);
      if (!this.validateV3(parsed)) {
        fs.unlinkSync(this.tmpPath);
        return { success: false, state: 'failed', details: 'Validation failed' };
      }
      console.log(`[${operationId}] Temp file validated: ${this.tmpPath}`);

      // Phase 4: 【アトミックスワップ】OSレベルのrename
      // この操作はアトミック: 成功すれば完全なv3、失敗すれば何も変わらない
      fs.renameSync(this.tmpPath, this.v3Path);
      console.log(`[${operationId}] ATOMIC RENAME completed: ${this.tmpPath} -> ${this.v3Path}`);

      // Phase 5: クリーンアップ（v2削除はオプション、保守的に残す）
      // fs.unlinkSync(this.v2Path); // コメントアウト: 安全のためv2は保持

      return { success: true, state: 'completed', details: operationId };

    } catch (error) {
      // ロールバック: tmpファイルのみ削除、v2は絶対に触らない
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

  /**
   * クラッシュ後の状態復旧
   * - tmpが残っていれば破棄
   * - v3が完成していれば正常
   * - v2のみなら再マイグレーション可能
   */
  recover(): { canMigrate: boolean; state: string } {
    const v2Exists = fs.existsSync(this.v2Path);
    const v3Exists = fs.existsSync(this.v3Path);
    const tmpExists = fs.existsSync(this.tmpPath);

    if (tmpExists) {
      // 前回のクラッシュ残骸をクリーンアップ
      fs.unlinkSync(this.tmpPath);
      return { canMigrate: v2Exists, state: 'cleaned_tmp' };
    }

    if (v3Exists) {
      return { canMigrate: false, state: 'v3_complete' };
    }

    if (v2Exists) {
      return { canMigrate: true, state: 'ready_to_migrate' };
    }

    return { canMigrate: false, state: 'no_data' };
  }

  private transform(v2Data: unknown): unknown {
    // v2 → v3 変換ロジック
    return {
      version: 3,
      migratedAt: new Date().toISOString(),
      data: v2Data
    };
  }

  private validateV3(data: unknown): boolean {
    return typeof data === 'object' && 
           data !== null && 
           (data as any).version === 3;
  }
}
