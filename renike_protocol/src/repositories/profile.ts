// ============================================
// ReNikeProtocol - User Profile Repository
// ============================================

import { getDB } from '../db/connection.js';
import { DID, UserProfile } from '../core/types.js';
import { NikeError } from '../core/errors.js';

export class ProfileRepository {
  /**
   * Get profile by DID
   */
  async findByDID(did: DID): Promise<UserProfile | null> {
    const db = getDB();
    const row = await db.get(
      'SELECT * FROM user_profiles WHERE did = ?',
      did
    );

    if (!row) return null;

    return {
      did: row.did as DID,
      displayName: row.display_name,
      totalMinted: row.total_minted,
      totalSpent: row.total_spent,
      gachaCount: row.gacha_count,
      lastActiveAt: new Date(row.last_active_at)
    };
  }

  /**
   * Create or update profile
   */
  async upsert(did: DID, displayName?: string): Promise<UserProfile> {
    const db = getDB();

    await db.run(
      `INSERT INTO user_profiles (did, display_name, last_active_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(did) DO UPDATE SET
       display_name = COALESCE(excluded.display_name, user_profiles.display_name),
       last_active_at = CURRENT_TIMESTAMP`,
      did, displayName ?? null
    );

    const profile = await this.findByDID(did);
    if (!profile) {
      throw new NikeError('Failed to upsert profile', 'UPSERT_FAILED');
    }

    return profile;
  }

  /**
   * Record mint activity
   */
  async recordMint(did: DID, amount: number): Promise<void> {
    const db = getDB();

    await db.run(
      `UPDATE user_profiles
       SET total_minted = total_minted + ?,
           last_active_at = CURRENT_TIMESTAMP
       WHERE did = ?`,
      amount, did
    );
  }

  /**
   * Record spend activity
   */
  async recordSpend(did: DID, amount: number): Promise<void> {
    const db = getDB();

    await db.run(
      `UPDATE user_profiles
       SET total_spent = total_spent + ?,
           last_active_at = CURRENT_TIMESTAMP
       WHERE did = ?`,
      amount, did
    );
  }

  /**
   * Record gacha activity
   */
  async recordGacha(did: DID): Promise<void> {
    const db = getDB();

    await db.run(
      `UPDATE user_profiles
       SET gacha_count = gacha_count + 1,
           last_active_at = CURRENT_TIMESTAMP
       WHERE did = ?`,
      did
    );
  }

  /**
   * Update last active timestamp
   */
  async touch(did: DID): Promise<void> {
    const db = getDB();

    await db.run(
      `INSERT INTO user_profiles (did, last_active_at)
       VALUES (?, CURRENT_TIMESTAMP)
       ON CONFLICT(did) DO UPDATE SET
       last_active_at = CURRENT_TIMESTAMP`,
      did
    );
  }

  /**
   * Get top users by various metrics
   */
  async getLeaderboard(metric: 'totalMinted' | 'totalSpent' | 'gachaCount', limit: number = 10): Promise<UserProfile[]> {
    const db = getDB();
    const column = metric === 'totalMinted' ? 'total_minted'
                 : metric === 'totalSpent' ? 'total_spent'
                 : 'gacha_count';

    const rows = await db.all(
      `SELECT * FROM user_profiles
       ORDER BY ${column} DESC
       LIMIT ?`,
      limit
    );

    return rows.map(row => ({
      did: row.did as DID,
      displayName: row.display_name,
      totalMinted: row.total_minted,
      totalSpent: row.total_spent,
      gachaCount: row.gacha_count,
      lastActiveAt: new Date(row.last_active_at)
    }));
  }

  /**
   * Get all profiles with wallet balances
   */
  async getAllWithBalances(): Promise<Array<UserProfile & { balance: number }>> {
    const db = getDB();
    const rows = await db.all(
      `SELECT p.*, COALESCE(w.balance, 0) as balance
       FROM user_profiles p
       LEFT JOIN wallets w ON p.did = w.did
       ORDER BY balance DESC`
    );

    return rows.map(row => ({
      did: row.did as DID,
      displayName: row.display_name,
      totalMinted: row.total_minted,
      totalSpent: row.total_spent,
      gachaCount: row.gacha_count,
      lastActiveAt: new Date(row.last_active_at),
      balance: row.balance
    }));
  }
}
