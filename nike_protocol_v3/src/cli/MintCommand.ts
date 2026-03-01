import { NikeCoinService } from '../application/services/NikeCoinFacade.js';

export interface MintOptions {
  did: string;
  amount: number;
}

export class MintCommand {
  async execute(options: MintOptions): Promise<void> {
    console.log(`Minting ${options.amount} coins to ${options.did}`);
    // Implementation would connect to DB and execute
  }
}
