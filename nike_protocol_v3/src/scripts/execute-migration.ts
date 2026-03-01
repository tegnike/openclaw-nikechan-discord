import { DataTransformer } from '../migration/DataTransformer.js';

async function main() {
  const transformer = new DataTransformer();
  
  // Example migration execution
  const v1Data = { accounts: {}, transactions: [] };
  const result = transformer.transform(v1Data);
  
  console.log('Migration result:', {
    accountCount: result.accounts.length,
    transactionCount: result.transactions.length,
    titleCount: result.titles.length
  });
}

main().catch(console.error);
