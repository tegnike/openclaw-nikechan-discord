import { EncryptedMigrator } from '../migration/EncryptedMigrator.js';

const nikeDir = process.env.HOME ? `${process.env.HOME}/.nike` : '/root/.nike';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Nike Protocol v3 Migration - Encrypted                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const migrator = new EncryptedMigrator(nikeDir);
migrator.migrate().then(result => {
  if (result.success) {
    console.log('\n✅ Migration completed successfully!');
    console.log(`   Operation ID: ${result.details}`);
    process.exit(0);
  } else {
    console.error('\n❌ Migration failed:', result.details);
    process.exit(1);
  }
});
