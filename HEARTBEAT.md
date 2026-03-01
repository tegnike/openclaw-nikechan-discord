# HEARTBEAT.md
# 定期実行タスク設定

## ニケコイン自動配布システム（v3）

### 処理フロー
1. 前回のHEARTBEATから現在までのメッセージを取得
2. 各ユーザーの投稿を評価（内容・頻度・貢献度）
3. 評価に応じてニケコインを付与（Commandパターン経由）
4. 配布結果をDiscordチャンネルに通知

### 評価基準
- **日常投稿**: 1-3枚（通常の会話参加）
- **面白い発言**: 3-5枚（笑いを誘った、盛り上げた）
- **有益情報**: 5-10枚（知識共有、助けになった）
- **クリエイティブ**: 10-20枚（作品、工夫が見られる）
- **特別貢献**: 20-50枚（大きな功績、感動を与えた）

### 配布上限
- 一日の上限: **撤廃**（めいちゃん指示）
- ただし、質とバランスを見て適切に配布

### 実行方法（v3）
```bash
# CLI経由でmint
node /workspace/nike_protocol_v3/dist/cli.js coin:mint -d <discord_id> -a <amount> -m "HEARTBEAT自動配布: <理由>"

# またはCommandパターン
import { MintCoinCommand } from '/workspace/nike_protocol_v3/dist/application/commands/MintCoinCommand.js';
const cmd = new MintCoinCommand(walletRepo, txRepo, signFn);
await cmd.execute({ discordId, amount, reason: "HEARTBEAT自動配布" });
```

### データベース（v3）
- **Path**: `~/.nike/coin_v3.db.enc`
- **暗号化**: AES-256-GCM
- **Tables**: accounts, transactions, gacha_inventory, user_profiles
- **DID Format**: `did:nike:discord:<user_id>`

### 注意事項
- SOUL.mdの「ニケコイン哲学」を遵守
- 「いいと思ったら」贈る精神を維持
- 機械的ではなく、評価の理由を添える
- v3移行後は新しいパス・APIを使用

### 移行状況
- ✅ v3実装完了
- ✅ v1 → v3 価値移行完了（2026-03-01）
- ✅ 本番稼働開始
- 📝 v2データはバックアップ保持（復号キー特定後完全移行予定）

### HEARTBEAT自動配布実装例（v3）
```typescript
import { MintCoinCommand } from '/workspace/nike_protocol_v3/dist/application/commands/MintCoinCommand.js';
import { SQLiteWalletRepository } from '/workspace/nike_protocol_v3/dist/infrastructure/repositories/SQLiteWalletRepository.js';
import { SQLiteTransactionRepository } from '/workspace/nike_protocol_v3/dist/infrastructure/repositories/SQLiteTransactionRepository.js';
import { createHmac } from 'crypto';

// リポジトリ初期化
const walletRepo = new SQLiteWalletRepository('/workspace/.nike/coin_v3.db.enc');
const txRepo = new SQLiteTransactionRepository('/workspace/.nike/coin_v3.db.enc');

// 署名関数
const signFn = (data: string) => {
  const secret = process.env.NIKECOIN_SECRET || 'default-secret';
  return createHmac('sha256', secret).update(data).digest('hex');
};

// Commandインスタンス作成
const mintCmd = new MintCoinCommand(walletRepo, txRepo, signFn);

// 自動配布実行
async function distributeCoins(discordId: string, amount: number, reason: string) {
  try {
    const result = await mintCmd.execute({
      discordId,
      amount,
      reason: `HEARTBEAT自動配布: ${reason}`
    });
    
    if (result.isOk()) {
      console.log(`✅ ${discordId} に ${amount} コイン配布完了`);
      return { success: true, txHash: result.value.txHash };
    } else {
      console.error(`❌ 配布失敗: ${result.error.message}`);
      return { success: false, error: result.error.message };
    }
  } catch (e) {
    console.error(`❌ 例外発生: ${e}`);
    return { success: false, error: String(e) };
  }
}

// 使用例
await distributeCoins('195028089577799680', 5, '面白い発言');
```
