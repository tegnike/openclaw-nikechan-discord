// User Service - Application Layer
// Manages user profiles and Discord ID resolution

import { UserProfile, UserProfileInput } from '../core/types.js';
import { IUserRepository } from '../core/interfaces.js';

export class UserService {
  constructor(private userRepo: IUserRepository) {}

  register(discordId: string, input: UserProfileInput): UserProfile {
    return this.userRepo.createOrUpdate(discordId, input);
  }

  updateProfile(discordId: string, input: Partial<UserProfileInput>): UserProfile | null {
    return this.userRepo.update(discordId, input);
  }

  getProfile(discordId: string): UserProfile | null {
    return this.userRepo.getByDiscordId(discordId);
  }

  findByUsername(username: string): UserProfile | null {
    return this.userRepo.getByUsername(username);
  }

  searchUsers(query: string, limit?: number): UserProfile[] {
    return this.userRepo.search(query, limit);
  }

  listAll(limit?: number): UserProfile[] {
    return this.userRepo.listAll(limit);
  }

  /**
   * Resolve a user identifier (Discord ID or username) to Discord ID
   * Returns null if not found
   */
  resolveToDiscordId(identifier: string): string | null {
    const resolved = this.userRepo.resolveIdentifier(identifier);
    return resolved?.discordId || null;
  }

  /**
   * Resolve a user identifier to both Discord ID and username
   */
  resolveUser(identifier: string): { discordId: string; username: string } | null {
    return this.userRepo.resolveIdentifier(identifier);
  }

  deleteUser(discordId: string): boolean {
    return this.userRepo.delete(discordId);
  }

  // Range query methods
  
  /**
   * Find users by exact timezone match
   * Example: findByTimezone("Asia/Tokyo")
   */
  findByTimezone(timezone: string, limit?: number): UserProfile[] {
    return this.userRepo.findByTimezone(timezone, limit);
  }

  /**
   * Find users by timezone prefix
   * Example: findByTimezonePrefix("Asia/") → Asia/Tokyo, Asia/Seoul, etc.
   */
  findByTimezonePrefix(prefix: string, limit?: number): UserProfile[] {
    return this.userRepo.findByTimezonePrefix(prefix, limit);
  }

  /**
   * Find users updated within a time range (Unix timestamps in ms)
   * Example: findRecentlyUpdated(Date.now() - 86400000, Date.now()) → last 24h
   */
  findByUpdatedAtRange(startTime: number, endTime: number, limit?: number): UserProfile[] {
    return this.userRepo.findByUpdatedAtRange(startTime, endTime, limit);
  }

  /**
   * Find users created within a time range (Unix timestamps in ms)
   */
  findByCreatedAtRange(startTime: number, endTime: number, limit?: number): UserProfile[] {
    return this.userRepo.findByCreatedAtRange(startTime, endTime, limit);
  }

  /**
   * Find recently updated users (convenience method)
   * @param hoursAgo Number of hours to look back
   */
  findRecentlyUpdated(hoursAgo: number = 24, limit?: number): UserProfile[] {
    const now = Date.now();
    const startTime = now - (hoursAgo * 60 * 60 * 1000);
    return this.findByUpdatedAtRange(startTime, now, limit);
  }

  /**
   * Find recently created users (convenience method)
   * @param hoursAgo Number of hours to look back
   */
  findRecentlyCreated(hoursAgo: number = 24, limit?: number): UserProfile[] {
    const now = Date.now();
    const startTime = now - (hoursAgo * 60 * 60 * 1000);
    return this.findByCreatedAtRange(startTime, now, limit);
  }
}
