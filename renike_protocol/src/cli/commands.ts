#!/usr/bin/env node
// ============================================
// ReNikeProtocol - CLI Commands
// ============================================

import { initDB, getDB } from '../db/connection.js';
import { WalletRepository } from '../repositories/wallet.js';
import { InventoryRepository } from '../repositories/inventory.js';
import { ProfileRepository } from '../repositories/profile.js';
import { CoinService } from '../services/coin.js';
import { GachaEngine } from '../gacha/engine.js';
import { TITLES } from '../gacha/titles.js';
import { DID } from '../core/types.js';

interface LogEntry {
  timestamp: string;
  operation: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  durationMs: number;
  error?: string;
}

function log(entry: LogEntry): void {
  console.log(JSON.stringify(entry, null, 2));
}

function parseDID(input: string): DID {
  // Allow special system DIDs
  if (input === "did:nike:system:gacha" || input === "did:nike:discord:did:nike:system:adjust") {
    return input as DID;
  }
  // Strict validation: only allow did:nike:discord:{17-20 digit numeric ID}
  const validDIDPattern = /^did:nike:discord:d{17,20}$/;
  
  if (validDIDPattern.test(input)) {
    return input as DID;
  }
  
  // If input looks like it has wrong prefix, extract just the numeric part
  if (input.includes(':')) {
    const parts = input.split(':');
    const lastPart = parts[parts.length - 1];
    if (/^d{17,20}$/.test(lastPart)) {
      return `did:nike:discord:${lastPart}` as DID;
    }
  }
  
  // Assume it's a raw Discord ID (17-20 digits)
  if (/^d{17,20}$/.test(input)) {
    return `did:nike:discord:${input}` as DID;
  }
  
  throw new Error(`Invalid DID format: ${input}. Expected did:nike:discord:<17-20 digit ID> or raw numeric ID`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  await initDB();

  const walletRepo = new WalletRepository();
  const inventoryRepo = new InventoryRepository();
  const profileRepo = new ProfileRepository();
  const coinService = new CoinService({ walletRepo, profileRepo });
  const gachaEngine = new GachaEngine();

  const startTime = Date.now();

  try {
    switch (command) {
      case 'balance': {
        const did = parseDID(args[1]);
        const result = await coinService.getBalance(did);

        log({
          timestamp: new Date().toISOString(),
          operation: 'balance',
          input: { did },
          output: result.success ? { balance: result.data!.balance } : { error: result.error },
          success: result.success,
          durationMs: Date.now() - startTime
        });

        if (result.success) {
          console.log(`\n💰 Balance: ${result.data!.balance} NikeCoins`);
        }
        break;
      }

      case 'mint': {
        const did = parseDID(args[1]);
        const amount = parseInt(args[2], 10);
        const description = args[3] || 'Admin mint';

        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid amount');
        }

        const result = await coinService.mint(did, amount, description);

        log({
          timestamp: new Date().toISOString(),
          operation: 'mint',
          input: { did, amount, description },
          output: result.success
            ? { newBalance: result.data!.newBalance, txId: result.data!.transactionId }
            : { error: result.error },
          success: result.success,
          durationMs: Date.now() - startTime
        });

        if (result.success) {
          console.log(`\n✅ Minted ${amount} coins to ${did}`);
          console.log(`💰 New balance: ${result.data!.newBalance}`);
          console.log(`📝 Transaction: ${result.data!.transactionId}`);
        }
        break;
      }

      case 'transfer': {
        const fromDid = parseDID(args[1]);
        const toDid = parseDID(args[2]);
        const amount = parseInt(args[3], 10);
        const description = args[4] || 'Transfer';

        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid amount');
        }

        const result = await coinService.transfer(fromDid, toDid, amount, description);

        log({
          timestamp: new Date().toISOString(),
          operation: 'transfer',
          input: { fromDid, toDid, amount, description },
          output: result.success
            ? {
                fromBalance: result.data!.fromBalance,
                toBalance: result.data!.toBalance,
                txId: result.data!.transactionId
              }
            : { error: result.error },
          success: result.success,
          durationMs: Date.now() - startTime
        });

        if (result.success) {
          console.log(`\n💸 Transferred ${amount} coins`);
          console.log(`📤 From balance: ${result.data!.fromBalance}`);
          console.log(`📥 To balance: ${result.data!.toBalance}`);
          console.log(`📝 Transaction: ${result.data!.transactionId}`);
        }
        break;
      }

      case 'history': {
        const did = parseDID(args[1]);
        const limit = parseInt(args[2], 10) || 20;

        const result = await coinService.getHistory(did, limit);

        log({
          timestamp: new Date().toISOString(),
          operation: 'history',
          input: { did, limit },
          output: result.success ? { count: result.data!.length } : { error: result.error },
          success: result.success,
          durationMs: Date.now() - startTime
        });

        if (result.success && result.data!.length > 0) {
          console.log('\n📜 Transaction History:');
          console.log('─'.repeat(60));
          for (const tx of result.data!) {
            const direction = tx.fromDid === did ? '→' : tx.toDid === did ? '←' : '•';
            console.log(`${tx.timestamp.toISOString()} | ${tx.type} ${direction} ${tx.amount} | ${tx.description}`);
          }
        }
        break;
      }

      case 'gacha': {
        const did = parseDID(args[1]);
        const count = parseInt(args[2], 10) || 1; // Default to single pull
        const costPerPull = 10;
        const totalCost = count * costPerPull;

        // Validate count
        if (isNaN(count) || count < 1 || count > 10) {
          throw new Error('Invalid count. Must be between 1 and 10.');
        }

        // Check balance
        const balanceResult = await coinService.getBalance(did);
        if (!balanceResult.success) {
          throw new Error(balanceResult.error);
        }

        if (balanceResult.data!.balance < totalCost) {
          throw new Error(`Insufficient balance: ${balanceResult.data!.balance} < ${totalCost}`);
        }

        // Get current inventory for pity calculation
        const inventory = await inventoryRepo.findByDID(did);
        const existingIds = inventory?.items.map(i => i.titleId) ?? [];

        // Deduct cost
        const transferResult = await coinService.transfer(
          did,
          'did:nike:system:gacha' as DID,
          totalCost,
          `Gacha ${count}-pull`
        );

        if (!transferResult.success) {
          throw new Error(transferResult.error);
        }

        // Pull gacha
        const pulls = gachaEngine.draw(count, existingIds);

        // Add to inventory
        for (const pull of pulls) {
          await inventoryRepo.addTitle(did, pull.title.id);
        }

        // Update profile
        await profileRepo.recordGacha(did);

        log({
          timestamp: new Date().toISOString(),
          operation: 'gacha',
          input: { did, count, costPerPull, totalCost },
          output: {
            pulls: pulls.map(p => ({ id: p.title.id, rarity: p.title.rarity, isNew: p.isNew })),
            newBalance: transferResult.data!.fromBalance
          },
          success: true,
          durationMs: Date.now() - startTime
        });

        console.log(`\n🎰 Gacha Results (${count} pull${count > 1 ? 's' : ''}):`);
        console.log('━'.repeat(40));
        for (let i = 0; i < pulls.length; i++) {
          const { title, isNew } = pulls[i];
          const emoji = { SS: '🔴', S: '🟠', A: '🟡', B: '🔵', C: '⚪' }[title.rarity];
          const newMark = isNew ? ' ✨NEW' : '';
          console.log(`${i + 1}. ${emoji} [${title.rarity}] ${title.name}${newMark}`);
        }
        console.log('━'.repeat(40));
        console.log(`💰 Balance: ${balanceResult.data!.balance} → ${transferResult.data!.fromBalance}`);
        break;
      }

      case 'inventory': {
        const did = parseDID(args[1]);
        const progress = await inventoryRepo.getProgress(did);

        log({
          timestamp: new Date().toISOString(),
          operation: 'inventory',
          input: { did },
          output: { owned: progress.owned, total: progress.total, percentage: progress.percentage },
          success: true,
          durationMs: Date.now() - startTime
        });

        console.log(`\n🎒 Collection: ${progress.owned}/${progress.total} (${progress.percentage}%)`);
        console.log('─'.repeat(40));
        for (const [rarity, stats] of Object.entries(progress.byRarity)) {
          const emoji = { SS: '🔴', S: '🟠', A: '🟡', B: '🔵', C: '⚪' }[rarity as keyof typeof progress.byRarity];
          console.log(`${emoji} ${rarity}: ${stats.owned}/${stats.total}`);
        }
        break;
      }

      case 'titles': {
        console.log('\n📋 All Titles:');
        console.log('═'.repeat(50));
        for (const rarity of ['SS', 'S', 'A', 'B', 'C'] as const) {
          const titles = TITLES.filter(t => t.rarity === rarity);
          const emoji = { SS: '🔴', S: '🟠', A: '🟡', B: '🔵', C: '⚪' }[rarity];
          console.log(`\n${emoji} ${rarity} (${titles.length} types):`);
          for (const title of titles) {
            console.log(`  • ${title.name} - ${title.description}`);
          }
        }
        break;
      }

      case 'stats': {
        const { GachaEngine } = await import('../gacha/engine.js');
        const stats = GachaEngine.getStatistics();

        log({
          timestamp: new Date().toISOString(),
          operation: 'stats',
          input: {},
          output: stats,
          success: true,
          durationMs: Date.now() - startTime
        });

        console.log('\n📊 Gacha Statistics:');
        console.log(`Total titles: ${stats.totalTitles}`);
        console.log(`Expected cost for SS: ${stats.expectedCostForSS} coins`);
        console.log('\nDrop rates:');
        for (const [rarity, info] of Object.entries(stats.byRarity)) {
          console.log(`  ${rarity}: ${info.count} types (${(info.rate * 100).toFixed(1)}%)`);
        }
        break;
      }

      case 'list': {
        const profiles = await profileRepo.getAllWithBalances();

        const result = profiles.map(p => ({
          DID: p.did,
          Username: p.displayName || null,
          Balance: p.balance,
          totalMinted: p.totalMinted
        }));

        log({
          timestamp: new Date().toISOString(),
          operation: 'list',
          input: {},
          output: { count: result.length },
          success: true,
          durationMs: Date.now() - startTime
        });

        // Output pure JSON for piping
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      default:
        console.log(`
ReNikeProtocol CLI

Usage:
  renike <command> [args...]

Commands:
  balance <did>                    - Check wallet balance
  mint <did> <amount> [desc]       - Mint coins (admin)
  transfer <from> <to> <amt> [desc] - Transfer coins
  history <did> [limit]            - Show transaction history
  gacha <did> [count]              - Perform gacha (10 coins/pull, default: 1)
  inventory <did>                  - Show title collection
  titles                           - List all available titles
  stats                            - Show gacha statistics
  list                             - List all users with balances

Examples:
  renike balance did:nike:discord:123456
  renike mint did:nike:discord:123456 1000 "Genesis"
  renike transfer 123456 789012 100 "Thanks!"
  renike gacha 123456    # Single pull (10 coins)
  renike gacha 123456 10 # 10-pull (100 coins)
  renike list            # Output JSON array of all users
`);
    }
  } catch (error) {
    log({
      timestamp: new Date().toISOString(),
      operation: command || 'unknown',
      input: { args },
      output: {},
      success: false,
      durationMs: Date.now() - startTime,
      error: (error as Error).message
    });

    console.error(`\n❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
