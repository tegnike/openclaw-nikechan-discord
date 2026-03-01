// Core Domain Types

export interface CoinAccount {
  did: string;
  discord_id: string;
  username: string | null;
  balance: number;
  total_received: number;
  total_sent: number;
  created_at: number;
  updated_at: number;
}

export interface CoinTransaction {
  id: string;
  from_did: string;
  to_did: string;
  amount: number;
  timestamp: number;
  signature: string;
  memo?: string;
}

export type TransactionType = 'mint' | 'transfer' | 'burn';

export interface TransactionWithDirection extends CoinTransaction {
  direction: 'in' | 'out';
  counterparty_did: string;
}

// User Profile Types
export interface UserProfile {
  discord_id: string;
  username: string;
  display_name: string | null;
  timezone: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface UserProfileInput {
  username: string;
  display_name?: string;
  timezone?: string;
  notes?: string;
}
