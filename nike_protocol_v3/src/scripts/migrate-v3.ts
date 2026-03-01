import * as fs from 'fs';
import * as path from 'path';
import { AtomicMigrator } from '../migration/AtomicMigrator.js';

const nikeDir = path.join(process.env.HOME || '/root', '.nike');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Nike Protocol v3 Migration - Production Ready          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// 事前チェック
if (!fs.existsSync(path.join(nikeDir, 'coin_v2.db.enc'))) {
  console.error('❌ v2 database not found. Nothing to migrate.');
  process.exit(1);
}

if (fs.existsSync(path.join(nikeDir, 'coin_v3.db.enc'))) {
  console.log('⚠️  v3 database already exists. Skipping migration.');
  process.exit(0);
}

console.log('📦 Creating backup...');
const backupDir = path.join(nikeDir, 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(
  path.join(nikeDir, 'coin_v2.db.enc'),
  path.join(backupDir, `pre_v3_migration_${timestamp}.backup`)
);
console.log(`   ✓ Backup saved\n`);

console.log('🔄 Starting atomic migration...');
const migrator = new AtomicMigrator(nikeDir);
migrator.migrate().then(result => {
  if (result.success) {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } else {
    console.error('\n❌ Migration failed:', result.details);
    process.exit(1);
  }
});
