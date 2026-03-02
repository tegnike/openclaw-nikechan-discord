// ============================================
// ReNikeProtocol - Core Types
// ============================================

export type DID = `did:nike:discord:${string}`;

export interface Wallet {
  did: DID;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'MINT' | 'TRANSFER' | 'GACHA';
  amount: number;
  fromDid: DID | null;
  toDid: DID | null;
  description: string;
  signature: string;
  timestamp: Date;
}

export type Rarity = 'SS' | 'S' | 'A' | 'B' | 'C';

export interface Title {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
}

export interface InventoryItem {
  titleId: string;
  obtainedAt: Date;
}

export interface UserInventory {
  did: DID;
  items: InventoryItem[];
}

export interface UserProfile {
  did: DID;
  displayName: string;
  totalMinted: number;
  totalSpent: number;
  gachaCount: number;
  lastActiveAt: Date;
}

export interface GachaResult {
  titles: Title[];
  cost: number;
  newBalance: number;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface StructuredLog {
  operation: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  durationMs: number;
  timestamp: ISO8601Timestamp;
}

type ISO8601Timestamp = string;
