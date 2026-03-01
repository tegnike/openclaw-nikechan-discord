#!/usr/bin/env node
import { Command } from 'commander';
import { GenesisCommand } from './commands/GenesisCommand.js';
import { StatusCommand } from './commands/StatusCommand.js';
import { GachaCommand } from './commands/GachaCommand.js';
import { InventoryCommand } from './commands/InventoryCommand.js';
import { MintCommand } from './commands/MintCommand.js';

const program = new Command();

program
  .name('nike-cli')
  .description('Nike Protocol v3 CLI - Manage Nike Coins and Gacha')
  .version('3.0.0');

program
  .command('genesis')
  .description('Grant initial coins to a new user (1000 coins)')
  .argument('<did>', 'User DID (discord:id format)')
  .action(async (did: string) => {
    const cmd = new GenesisCommand();
    await cmd.execute(did);
  });

program
  .command('mint')
  .description('Mint coins to a user')
  .argument('<did>', 'User DID')
  .argument('<amount>', 'Amount to mint', parseInt)
  .option('-d, --description <desc>', 'Transaction description')
  .action(async (did: string, amount: number, options: { description?: string }) => {
    const cmd = new MintCommand();
    await cmd.execute({ did, amount, description: options.description });
  });

program
  .command('status')
  .description('Check wallet balance and status')
  .argument('<did>', 'User DID')
  .action(async (did: string) => {
    const cmd = new StatusCommand();
    await cmd.execute(did);
  });

program
  .command('gacha')
  .description('Pull gacha (10 coins per pull)')
  .argument('<did>', 'User DID')
  .argument('<count>', 'Number of pulls (1 or 10)', parseInt)
  .action(async (did: string, count: number) => {
    const cmd = new GachaCommand();
    await cmd.execute({ did, count });
  });

program
  .command('inventory')
  .description('List acquired titles')
  .argument('<did>', 'User DID')
  .action(async (did: string) => {
    const cmd = new InventoryCommand();
    await cmd.execute(did);
  });

program.parse();
