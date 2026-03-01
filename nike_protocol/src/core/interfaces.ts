// Core Interfaces - Repository Abstractions

import { CoinAccount, CoinTransaction, TransactionWithDirection, UserProfile, UserProfileInput } from './types.js';

export interface IAccountRepository {
  getOrCreate(discordId: string, username?: string): CoinAccount;
  update(account: CoinAccount): void;
  listAll(limit?: number): CoinAccount[];
}

export interface ITransactionRepository {
  save(tx: CoinTransaction): void;
  getHistory(discordId: string, limit?: number): TransactionWithDirection[];
}

export interface IUserRepository {
  getByDiscordId(discordId: string): UserProfile | null;
  getByUsername(username: string): UserProfile | null;
  createOrUpdate(discordId: string, input: UserProfileInput): UserProfile;
  update(discordId: string, input: Partial<UserProfileInput>): UserProfile | null;
  delete(discordId: string): boolean;
  listAll(limit?: number): UserProfile[];
  search(query: string, limit?: number): UserProfile[];
  resolveIdentifier(identifier: string): { discordId: string; username: string } | null;
  
  // Range queries
  findByTimezone(timezone: string, limit?: number): UserProfile[];
  findByTimezonePrefix(prefix: string, limit?: number): UserProfile[];
  findByUpdatedAtRange(startTime: number, endTime: number, limit?: number): UserProfile[];
  findByCreatedAtRange(startTime: number, endTime: number, limit?: number): UserProfile[];
}

export interface ISigner {
  sign(data: object): string;
  verify(data: object, signature: string): boolean;
}

export interface IEncryptionService {
  encrypt(plaintext: Buffer): Buffer;
  decrypt(ciphertext: Buffer): Buffer;
}
