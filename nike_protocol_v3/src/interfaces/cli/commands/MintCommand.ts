import { Command } from 'commander';
import { NikeCoinService } from '../../../application/services/NikeCoinService.js';

export function createMintCommand(): Command {
  const cmd = new Command('mint');
  cmd
    .description('Mint coins to a wallet (admin only)')
    .requiredOption('-d, --did <did>', 'Target user DID')
    .requiredOption('-a, --amount <amount>', 'Amount to mint', parseInt)
    .requiredOption('-r, --reason <reason>', 'Reason for minting')
    .action(async (options) => {
      try {
        const service = await NikeCoinService.create();
        
        console.log('💰 Minting coins...');
        console.log(`   Target: ${options.did}`);
        console.log(`   Amount: ${options.amount}`);
        console.log(`   Reason: ${options.reason}`);
        console.log('');
        
        const result = await service.mint(options.did, options.amount, options.reason);
        
        if (result.success) {
          const tx = result.data;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ Mint Successful');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`Transaction ID: ${tx.txId}`);
          console.log(`Amount:         +${options.amount} coins`);
          console.log(`New Balance:    ${tx.newBalance} coins`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
          const errorResult = result as { success: false; error: { message: string } };
          console.error('❌ Mint failed:', errorResult.error.message);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
      }
    });
  return cmd;
}
