import { Command } from 'commander';
import { NikeCoinService } from '../../../application/services/NikeCoinService.js';

export function createTransferCommand(): Command {
  const cmd = new Command('transfer');
  cmd
    .description('Transfer coins between wallets')
    .requiredOption('-f, --from <did>', 'Source user DID')
    .requiredOption('-t, --to <did>', 'Target user DID')
    .requiredOption('-a, --amount <amount>', 'Amount to transfer', parseInt)
    .option('-m, --memo <memo>', 'Transfer memo')
    .action(async (options) => {
      try {
        const service = await NikeCoinService.create();
        
        console.log('💸 Transferring coins...');
        console.log(`   From:   ${options.from}`);
        console.log(`   To:     ${options.to}`);
        console.log(`   Amount: ${options.amount}`);
        if (options.memo) console.log(`   Memo:   ${options.memo}`);
        console.log('');
        
        const result = await service.transfer(
          options.from,
          options.to,
          options.amount,
          options.memo || 'CLI transfer'
        );
        
        if (result.success) {
          const tx = result.data;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ Transfer Successful');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`Transaction ID: ${tx.txId}`);
          console.log(`Amount:         ${options.amount} coins`);
          console.log(`From Balance:   ${tx.fromBalance} coins`);
          console.log(`To Balance:     ${tx.toBalance} coins`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
          const errorResult = result as { success: false; error: { message: string } };
          console.error('❌ Transfer failed:', errorResult.error.message);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
      }
    });
  return cmd;
}
