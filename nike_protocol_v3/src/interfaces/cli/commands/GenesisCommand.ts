import { Command } from 'commander';
import { NikeCoinService } from '../../../application/services/NikeCoinService.js';

export function createGenesisCommand(): Command {
  const cmd = new Command('genesis');
  cmd
    .description('Grant initial coins to a new user (1000 coins)')
    .requiredOption('-d, --did <did>', 'User DID (discord:id format)')
    .action(async (options) => {
      try {
        const service = await NikeCoinService.create();
        
        console.log('🌟 Genesis - Initial Coin Grant');
        console.log(`   Target: ${options.did}`);
        console.log(`   Amount: 1000 coins`);
        console.log('');
        
        const result = await service.mint(options.did, 1000, 'Genesis - Initial grant');
        
        if (result.success) {
          const tx = result.data;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ Genesis Complete!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`Transaction ID: ${tx.txId}`);
          console.log(`Amount:         +1000 coins`);
          console.log(`New Balance:    ${tx.newBalance} coins`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('Welcome to Nike Protocol v3! 💜');
        } else {
          const errorResult = result as { success: false; error: { message: string } };
          console.error('❌ Genesis failed:', errorResult.error.message);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
      }
    });
  return cmd;
}
