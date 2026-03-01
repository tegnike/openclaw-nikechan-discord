import { MigrationOrchestrator } from '../migration/MigrationOrchestrator.js';

export interface MigrateOptions {
  source: string;
  target: string;
  key: string;
}

export class MigrateCommand {
  async execute(options: MigrateOptions): Promise<void> {
    const orchestrator = new MigrationOrchestrator();
    
    const result = await orchestrator.run({
      sourcePath: options.source,
      targetPath: options.target,
      encryptionKey: options.key
    });

    if (result.success) {
      console.log(`Migration completed: ${result.migrated} wallets migrated`);
    } else {
      console.error('Migration failed');
      process.exit(1);
    }
  }
}
