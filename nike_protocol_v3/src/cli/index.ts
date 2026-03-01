#!/usr/bin/env node
import { MintCommand } from './MintCommand.js';
import { MigrateCommand } from './MigrateCommand.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'mint') {
    const mintCmd = new MintCommand();
    await mintCmd.execute({
      did: args[1] || '',
      amount: parseInt(args[2]) || 0
    });
  } else if (command === 'migrate') {
    const migrateCmd = new MigrateCommand();
    await migrateCmd.execute({
      source: args[1] || '',
      target: args[2] || '',
      key: args[3] || ''
    });
  } else {
    console.log('Usage: nikecoin <mint|migrate> [args...]');
  }
}

main().catch(console.error);
