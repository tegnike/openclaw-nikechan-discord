#!/usr/bin/env node
import { Command } from 'commander';
import { gachaSystem } from './gacha_v2.js';
import { coinSystem } from './nikecoin_v2.js';

const program = new Command();

program
  .name('nike')
  .description('Nike Protocol CLI - Discord Edition')
  .version('0.1.0');

// Coin v2 commands
program
  .command('coin:mint')
  .description('Mint coins to a user (admin only)')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .requiredOption('-a, --amount <n>', 'Amount to mint')
  .option('-m, --memo <text>', 'Memo')
  .option('-u, --username <name>', 'Username')
  .action((options) => {
    const amount = parseInt(options.amount);
    const tx = coinSystem.mint(options.discordId, amount, options.memo, options.username);
    console.log(`✓ Minted ${amount} NikeCoin to ${options.discordId}`);
    console.log(`  TX: ${tx.id}`);
    console.log(`  Balance: ${coinSystem.getBalance(options.discordId)}`);
  });

program
  .command('coin:send')
  .description('Send coins to another user')
  .requiredOption('-f, --from <id>', 'Sender Discord ID')
  .requiredOption('-t, --to <id>', 'Recipient Discord ID')
  .requiredOption('-a, --amount <n>', 'Amount to send')
  .option('-m, --memo <text>', 'Memo')
  .action((options) => {
    const amount = parseInt(options.amount);
    try {
      const tx = coinSystem.send(options.from, options.to, amount, options.memo);
      console.log(`✓ Sent ${amount} NikeCoin`);
      console.log(`  From: ${options.from}`);
      console.log(`  To: ${options.to}`);
      console.log(`  TX: ${tx.id}`);
      console.log(`  Your balance: ${coinSystem.getBalance(options.from)}`);
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('coin:balance')
  .description('Check coin balance')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .action((options) => {
    const balance = coinSystem.getBalance(options.discordId);
    const stats = coinSystem.getStats(options.discordId);
    console.log(`Balance: ${balance} NikeCoin`);
    console.log(`Total received: ${stats.total_received}`);
    console.log(`Total sent: ${stats.total_sent}`);
  });

program
  .command('coin:history')
  .description('Show transaction history')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .option('-l, --limit <n>', 'Number of transactions', '10')
  .action((options) => {
    const txs = coinSystem.getHistory(options.discordId, parseInt(options.limit));
    if (txs.length === 0) {
      console.log('No transactions');
      return;
    }
    console.log(`Recent ${txs.length} transactions:`);
    txs.forEach(tx => {
      const arrow = tx.direction === 'sent' ? '→' : '←';
      const other = tx.other_discord_id === 'SYSTEM' ? 'SYSTEM' : tx.other_discord_id;
      console.log(`  ${new Date(tx.timestamp).toISOString()} ${arrow} ${other}: ${tx.amount} NC`);
      if (tx.memo) console.log(`    "${tx.memo}"`);
    });
  });

program
  .command('coin:list')
  .description('List all accounts with balances')
  .option('-l, --limit <n>', 'Number of accounts to show', '20')
  .action((options) => {
    const accounts = coinSystem.listAccounts(parseInt(options.limit));
    if (accounts.length === 0) {
      console.log('No accounts found');
      return;
    }
    console.log(`=== All Accounts (${accounts.length}) ===`);
    console.log('Rank | Discord ID           | Username        | Balance   | Total In  | Total Out');
    console.log('-----+----------------------+-----------------+-----------+-----------+----------');
    accounts.forEach((acc, i) => {
      const rank = `${i + 1}`.padStart(4);
      const did = acc.discord_id.padEnd(20);
      const name = (acc.username || '-').substring(0, 15).padEnd(15);
      const bal = acc.balance.toLocaleString().padStart(9);
      const in_ = acc.total_received.toLocaleString().padStart(9);
      const out = acc.total_sent.toLocaleString().padStart(9);
      console.log(`${rank} | ${did} | ${name} | ${bal} | ${in_} | ${out}`);
    });
  });

program
  .command('coin:burn')
  .description('Burn coins (destroy permanently)')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .requiredOption('-a, --amount <n>', 'Amount to burn')
  .option('-m, --memo <text>', 'Memo')
  .action((options) => {
    const amount = parseInt(options.amount);
    try {
      const tx = coinSystem.burn(options.discordId, amount, options.memo);
      console.log(`✓ Burned ${amount} NikeCoin`);
      console.log(`  TX: ${tx.id}`);
      console.log(`  Remaining balance: ${coinSystem.getBalance(options.discordId)}`);
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('coin:verify')
  .description('Verify a transaction signature')
  .requiredOption('-i, --tx-id <id>', 'Transaction ID')
  .action((options) => {
    // Get transaction from history (need to implement getTransactionById)
    console.log('Transaction verification requires database query implementation');
    console.log('Use coin:history to view transaction details including signatures');
  });

// Gacha v2 commands
const rarityColors: Record<string, string> = {
  SS: '\x1b[35m',
  S: '\x1b[31m',
  A: '\x1b[33m',
  B: '\x1b[34m',
  C: '\x1b[32m'
};
const resetColor = '\x1b[0m';

program
  .command('gacha:single')
  .description('Single gacha pull (cost: 100 NC)')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .action((options) => {
    try {
      const result = gachaSystem.pull(options.discordId);
      const color = rarityColors[result.result.title.rarity] || '';
      const newBadge = result.result.isNew ? ' [NEW!]' : '';
      console.log(`${color}[${result.result.title.rarity}] ${result.result.title.name}${newBadge}${resetColor}`);
      console.log(`  "${result.result.title.flavor}"`);
      console.log(`  Cost: ${result.cost} NC | Balance: ${result.remainingBalance} NC`);
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('gacha:ten')
  .description('10-pull gacha (cost: 900 NC, guaranteed A+)')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .action((options) => {
    try {
      const pull = gachaSystem.pull10(options.discordId);
      console.log('=== 10-Pull Results ===');
      pull.results.forEach((r, i) => {
        const color = rarityColors[r.title.rarity] || '';
        const newBadge = r.isNew ? ' [NEW!]' : '';
        console.log(`${i + 1}. ${color}[${r.title.rarity}] ${r.title.name}${newBadge}${resetColor}`);
      });
      console.log(`\nTotal cost: ${pull.cost} NC | Remaining: ${pull.remainingBalance} NC`);
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('gacha:inventory')
  .description('Show your title collection')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .action((options) => {
    const inventory = gachaSystem.getInventory(options.discordId);
    const equipped = gachaSystem.getEquippedTitle(options.discordId);
    
    if (inventory.length === 0) {
      console.log('No titles collected yet. Try: nike gacha:single -d ' + options.discordId);
      return;
    }

    console.log('=== Title Collection ===');
    if (equipped) {
      console.log(`\nEquipped: ${rarityColors[equipped.rarity]}[${equipped.rarity}] ${equipped.name}${resetColor}`);
    }
    console.log('');

    // Group by rarity
    const byRarity: Record<string, typeof inventory> = { SS: [], S: [], A: [], B: [], C: [] };
    inventory.forEach(item => {
      byRarity[item.rarity].push(item);
    });

    (['SS', 'S', 'A', 'B', 'C'] as const).forEach(rarity => {
      const items = byRarity[rarity];
      if (items.length > 0) {
        console.log(`${rarityColors[rarity]}[${rarity}]${resetColor} (${items.length}):`);
        items.forEach(item => {
          const countBadge = item.count > 1 ? ` x${item.count}` : '';
          console.log(`  ${item.name}${countBadge}`);
        });
      }
    });
  });

program
  .command('gacha:equip')
  .description('Equip a title')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .requiredOption('-t, --title-id <id>', 'Title ID (e.g., ss_001)')
  .action((options) => {
    const success = gachaSystem.equipTitle(options.discordId, options.titleId);
    if (success) {
      const title = gachaSystem.getTitleById(options.titleId);
      if (title) {
        const color = rarityColors[title.rarity] || '';
        console.log(`✓ Equipped: ${color}[${title.rarity}] ${title.name}${resetColor}`);
      }
    } else {
      console.error('✗ You do not own this title');
      process.exit(1);
    }
  });

program
  .command('gacha:unequip')
  .description('Unequip current title')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .action((options) => {
    gachaSystem.unequipTitle(options.discordId);
    console.log('✓ Unequipped title');
  });

program
  .command('gacha:history')
  .description('Show gacha pull history')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .option('-l, --limit <n>', 'Number of pulls to show', '20')
  .action((options) => {
    const history = gachaSystem.getHistory(options.discordId, parseInt(options.limit));
    if (history.length === 0) {
      console.log('No gacha history yet');
      return;
    }

    console.log('=== Gacha History ===');
    history.forEach(h => {
      const title = gachaSystem.getTitleById(h.title_id);
      const color = rarityColors[h.rarity] || '';
      console.log(`${new Date(h.pulled_at).toISOString()} ${color}[${h.rarity}]${resetColor} ${title?.name || h.title_id} (-${h.cost} NC)`);
    });
  });

program
  .command('gacha:titles')
  .description('List all available titles')
  .action(() => {
    const titles = gachaSystem.getAllTitles();
    console.log('=== All Titles ===');
    (['SS', 'S', 'A', 'B', 'C'] as const).forEach(rarity => {
      const items = titles.filter(t => t.rarity === rarity);
      console.log(`\n${rarityColors[rarity]}[${rarity}]${resetColor} (${items.length} titles):`);
      items.forEach(t => {
        console.log(`  ${t.id}: ${t.name}`);
      });
    });
  });

program
  .command('profile')
  .description('Show full profile (coins + titles)')
  .requiredOption('-d, --discord-id <id>', 'Discord user ID')
  .action((options) => {
    const did = `did:nike:discord:${options.discordId}`;
    
    // Coin info
    const balance = coinSystem.getBalance(options.discordId);
    const coinStats = coinSystem.getStats(options.discordId);
    
    // Gacha info
    const inventory = gachaSystem.getInventory(options.discordId);
    const equipped = gachaSystem.getEquippedTitle(options.discordId);
    
    console.log('=== Profile ===');
    console.log(`DID: ${did}`);
    console.log(`\n[NikeCoin]`);
    console.log(`  Balance: ${balance} NC`);
    console.log(`  Total Received: ${coinStats.total_received} NC`);
    console.log(`  Total Sent: ${coinStats.total_sent} NC`);
    
    console.log(`\n[Titles]`);
    console.log(`  Collected: ${inventory.length}/110`);
    if (equipped) {
      const color = rarityColors[equipped.rarity] || '';
      console.log(`  Equipped: ${color}[${equipped.rarity}] ${equipped.name}${resetColor}`);
    }
    
    // Rarity breakdown
    const counts = { SS: 0, S: 0, A: 0, B: 0, C: 0 };
    inventory.forEach(i => counts[i.rarity]++);
    console.log(`  Breakdown: SS:${counts.SS} S:${counts.S} A:${counts.A} B:${counts.B} C:${counts.C}`);
  });

program.parse();
