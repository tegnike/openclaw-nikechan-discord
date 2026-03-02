// ============================================
// ReNikeProtocol - Main Entry Point
// ============================================

export { initDB, getDB, withTransaction } from './db/connection.js';
export * from './core/types.js';
export * from './core/errors.js';
export { WalletRepository } from './repositories/wallet.js';
export { InventoryRepository } from './repositories/inventory.js';
export { ProfileRepository } from './repositories/profile.js';
export { CoinService } from './services/coin.js';
export { GachaEngine } from './gacha/engine.js';
export { TITLES, DROP_RATES, getTitleById, getTitlesByRarity } from './gacha/titles.js';

// Version info
export const VERSION = '1.0.0';
export const PROTOCOL_NAME = 'ReNikeProtocol';
