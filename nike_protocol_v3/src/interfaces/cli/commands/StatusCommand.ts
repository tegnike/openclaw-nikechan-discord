import { Command } from 'commander';
import { NikeCoinService } from '../../../application/services/NikeCoinService.js';

export function createStatusCommand(): Command {
  const cmd = new Command('status');
  cmd
    .description('Check wallet status')
    .requiredOption('-d, --did <did>', 'User DID (e.g., did:nike:discord:<id>)')
    .action(async (options) => {
      try {
        const service = await NikeCoinService.create();
        const result = await service.getWallet(options.did);
        
        if (result.success) {
          const wallet = result.data;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('💜 Nike Coin Wallet Status');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`DID:        ${wallet.did}`);
          console.log(`Balance:    ${wallet.balance} coins`);
          console.log(`Version:    ${wallet.version}`);
          console.log(`Updated:    ${wallet.updatedAt.toISOString()}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
          // Type assertion needed because TS doesn't narrow properly
          const errorResult = result as { success: false; error: { message: string } };
          console.error('❌ Error:', errorResult.error.message);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
      }
    });
  return cmd;
}
