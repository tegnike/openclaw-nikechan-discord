// User Repository - Infrastructure Layer
// Manages user profile data with Discord ID mapping

import Database from 'better-sqlite3';
import { UserProfile, UserProfileInput } from '../../core/types.js';
import { IUserRepository } from '../../core/interfaces.js';

export class UserRepository implements IUserRepository {
  constructor(private db: Database.Database) {
    this.initializeTable();
  }

  private initializeTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        discord_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        display_name TEXT,
        timezone TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_username ON user_profiles(username);
    `);
  }

  getByDiscordId(discordId: string): UserProfile | null {
    const row = this.db.prepare(
      'SELECT * FROM user_profiles WHERE discord_id = ?'
    ).get(discordId) as UserProfile | undefined;
    
    return row || null;
  }

  getByUsername(username: string): UserProfile | null {
    const row = this.db.prepare(
      'SELECT * FROM user_profiles WHERE username = ? COLLATE NOCASE'
    ).get(username) as UserProfile | undefined;
    
    return row || null;
  }

  createOrUpdate(discordId: string, input: UserProfileInput): UserProfile {
    const now = Date.now();
    
    this.db.prepare(`
      INSERT INTO user_profiles (discord_id, username, display_name, timezone, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET
        username = excluded.username,
        display_name = COALESCE(excluded.display_name, user_profiles.display_name),
        timezone = COALESCE(excluded.timezone, user_profiles.timezone),
        notes = COALESCE(excluded.notes, user_profiles.notes),
        updated_at = excluded.updated_at
    `).run(
      discordId,
      input.username,
      input.display_name || null,
      input.timezone || null,
      input.notes || null,
      now,
      now
    );
    
    return this.getByDiscordId(discordId)!;
  }

  update(discordId: string, input: Partial<UserProfileInput>): UserProfile | null {
    const existing = this.getByDiscordId(discordId);
    if (!existing) return null;
    
    const now = Date.now();
    
    if (input.username !== undefined) {
      this.db.prepare('UPDATE user_profiles SET username = ?, updated_at = ? WHERE discord_id = ?')
        .run(input.username, now, discordId);
    }
    if (input.display_name !== undefined) {
      this.db.prepare('UPDATE user_profiles SET display_name = ?, updated_at = ? WHERE discord_id = ?')
        .run(input.display_name, now, discordId);
    }
    if (input.timezone !== undefined) {
      this.db.prepare('UPDATE user_profiles SET timezone = ?, updated_at = ? WHERE discord_id = ?')
        .run(input.timezone, now, discordId);
    }
    if (input.notes !== undefined) {
      this.db.prepare('UPDATE user_profiles SET notes = ?, updated_at = ? WHERE discord_id = ?')
        .run(input.notes, now, discordId);
    }
    
    return this.getByDiscordId(discordId);
  }

  delete(discordId: string): boolean {
    const result = this.db.prepare('DELETE FROM user_profiles WHERE discord_id = ?').run(discordId);
    return result.changes > 0;
  }

  listAll(limit = 100): UserProfile[] {
    return this.db.prepare(
      'SELECT * FROM user_profiles ORDER BY username LIMIT ?'
    ).all(limit) as UserProfile[];
  }

  search(query: string, limit = 20): UserProfile[] {
    const pattern = `%${query}%`;
    return this.db.prepare(`
      SELECT * FROM user_profiles 
      WHERE username LIKE ? 
         OR display_name LIKE ? 
         OR discord_id LIKE ?
      ORDER BY username 
      LIMIT ?
    `).all(pattern, pattern, pattern, limit) as UserProfile[];
  }

  resolveIdentifier(identifier: string): { discordId: string; username: string } | null {
    // Try exact Discord ID match first
    if (/^\d{17,20}$/.test(identifier)) {
      const byId = this.getByDiscordId(identifier);
      if (byId) {
        return { discordId: byId.discord_id, username: byId.username };
      }
    }
    
    // Try username lookup
    const byName = this.getByUsername(identifier);
    if (byName) {
      return { discordId: byName.discord_id, username: byName.username };
    }
    
    return null;
  }

  // Range query implementations
  findByTimezone(timezone: string, limit = 100): UserProfile[] {
    return this.db.prepare(`
      SELECT * FROM user_profiles 
      WHERE timezone = ? COLLATE NOCASE
      ORDER BY username 
      LIMIT ?
    `).all(timezone, limit) as UserProfile[];
  }

  findByTimezonePrefix(prefix: string, limit = 100): UserProfile[] {
    const pattern = `${prefix}%`;
    return this.db.prepare(`
      SELECT * FROM user_profiles 
      WHERE timezone LIKE ? COLLATE NOCASE
      ORDER BY username 
      LIMIT ?
    `).all(pattern, limit) as UserProfile[];
  }

  findByUpdatedAtRange(startTime: number, endTime: number, limit = 100): UserProfile[] {
    return this.db.prepare(`
      SELECT * FROM user_profiles 
      WHERE updated_at >= ? AND updated_at <= ?
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(startTime, endTime, limit) as UserProfile[];
  }

  findByCreatedAtRange(startTime: number, endTime: number, limit = 100): UserProfile[] {
    return this.db.prepare(`
      SELECT * FROM user_profiles 
      WHERE created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(startTime, endTime, limit) as UserProfile[];
  }
}
