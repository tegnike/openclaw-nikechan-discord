// Migration data transformer
export interface TransformationResult {
  wallets: Array<{ did: string; balance: number }>;
  accounts: Array<{ did: string; balance: number }>;
  transactions: Array<{
    id: string;
    did: string;
    amount: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
  titles: Array<{
    id: string;
    name: string;
    rarity: string;
  }>;
  errors?: string[];
}

export class DataTransformer {
  static validateDataset(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data) {
      errors.push('No data provided');
      return { valid: false, errors };
    }
    
    return { valid: errors.length === 0, errors };
  }

  transform(v1Data: any): TransformationResult {
    const accounts: TransformationResult['accounts'] = [];
    const wallets: TransformationResult['wallets'] = [];
    const transactions: TransformationResult['transactions'] = [];
    
    // Transform v1 accounts
    if (v1Data.accounts) {
      for (const [did, balance] of Object.entries(v1Data.accounts)) {
        accounts.push({ did, balance: balance as number });
        wallets.push({ did, balance: balance as number });
      }
    }
    
    // Transform v1 transactions
    if (v1Data.transactions) {
      for (const tx of v1Data.transactions) {
        transactions.push({
          id: tx.id || crypto.randomUUID(),
          did: tx.did || tx.discordId,
          amount: tx.amount,
          type: tx.type || 'UNKNOWN',
          description: tx.description || '',
          createdAt: tx.createdAt || new Date().toISOString()
        });
      }
    }
    
    return {
      wallets,
      accounts,
      transactions,
      titles: []
    };
  }
}
