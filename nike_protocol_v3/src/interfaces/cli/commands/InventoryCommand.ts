import { Command } from 'commander';
import { GachaService } from '../../../application/services/GachaService.js';

export function createInventoryCommand(): Command {
  const cmd = new Command('inventory');
  cmd
    .description('View gacha inventory')
    .requiredOption('-d, --did <did>', 'User DID')
    .action(async (options) => {
      try {
        const service = await GachaService.create();
        const result = await service.getInventory(options.did);
        
        if (result.success) {
          const titles = result.data;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🎒 Gacha Inventory');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          if (titles.length === 0) {
            console.log('No titles obtained yet.');
          } else {
            // Group by rarity
            const byRarity: Record<string, typeof titles> = {};
            titles.forEach(t => {
              if (!byRarity[t.rarity]) byRarity[t.rarity] = [];
              byRarity[t.rarity].push(t);
            });
            
            const rarityOrder = ['SS', 'S', 'A', 'B', 'C'] as const;
            const emojiMap: Record<string, string> = { 'SS': '🔴', 'S': '🟠', 'A': '🟡', 'B': '🔵', 'C': '⚪' };
            
            rarityOrder.forEach(rarity => {
              if (byRarity[rarity]) {
                console.log(`\n${emojiMap[rarity]} ${rarity} Rank (${byRarity[rarity].length})`);
                byRarity[rarity].forEach(t => console.log(`   • ${t.name}`));
              }
            });
          }
          
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`Total: ${titles.length} titles`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
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
