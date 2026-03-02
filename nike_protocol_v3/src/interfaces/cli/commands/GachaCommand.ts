import { Command } from 'commander';
import { GachaService } from '../../../application/services/GachaService.js';
import { NikeCoinService } from '../../../application/services/NikeCoinService.js';

export function createGachaCommand(): Command {
  const cmd = new Command('gacha');
  cmd
    .description('Pull gacha (10 pulls for 100 coins)')
    .requiredOption('-d, --did <did>', 'User DID')
    .action(async (options) => {
      try {
        const gachaService = await GachaService.create();
        const coinService = await NikeCoinService.create();
        
        // Check balance before pull
        const walletResult = await coinService.getWallet(options.did);
        if (!walletResult.success) {
          const errorResult = walletResult as { success: false; error: { message: string } };
          console.error('❌ Failed to get wallet:', errorResult.error.message);
          process.exit(1);
        }
        
        const beforeBalance = walletResult.data.balance;
        if (beforeBalance < 100) {
          console.error(`❌ Insufficient balance: ${beforeBalance} coins (need 100)`);
          process.exit(1);
        }
        
        console.log('🎰 Starting 10-pull gacha...');
        console.log(`💰 Balance before: ${beforeBalance} coins`);
        console.log('');
        
        const result = await gachaService.pull10(options.did);
        
        if (result.success) {
          const pull = result.data;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🎉 Gacha Results');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          pull.titles.forEach((title, i) => {
            const rarityEmoji: Record<string, string> = {
              'SS': '🔴',
              'S': '🟠', 
              'A': '🟡',
              'B': '🔵',
              'C': '⚪'
            };
            console.log(`${i + 1}. ${rarityEmoji[title.rarity] || '⚪'} [${title.rarity}] ${title.name}`);
          });
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          const afterBalance = beforeBalance - 100;
          console.log(`💰 Balance: ${beforeBalance} → ${afterBalance} coins`);
          console.log(`📝 Transaction: ${pull.transactionId}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
          const errorResult = result as { success: false; error: { message: string } };
          console.error('❌ Gacha failed:', errorResult.error.message);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
      }
    });
  return cmd;
}
