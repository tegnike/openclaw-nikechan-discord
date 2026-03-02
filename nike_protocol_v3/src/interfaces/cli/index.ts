#!/usr/bin/env node
import { Command } from 'commander';
import { createGenesisCommand } from './commands/GenesisCommand.js';
import { createStatusCommand } from './commands/StatusCommand.js';
import { createGachaCommand } from './commands/GachaCommand.js';
import { createInventoryCommand } from './commands/InventoryCommand.js';
import { createMintCommand } from './commands/MintCommand.js';
import { createTransferCommand } from './commands/TransferCommand.js';

const program = new Command();

program
  .name('nike-cli')
  .description('Nike Protocol v3 CLI - Manage Nike Coins and Gacha')
  .version('3.0.0');

// Add commands
program.addCommand(createGenesisCommand());
program.addCommand(createStatusCommand());
program.addCommand(createGachaCommand());
program.addCommand(createInventoryCommand());
program.addCommand(createMintCommand());
program.addCommand(createTransferCommand());

program.parse();
