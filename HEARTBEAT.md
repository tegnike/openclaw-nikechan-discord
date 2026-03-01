# HEARTBEAT.md
# 定期実行タスク設定

## ニケコイン自動配布システム（v2）

### 処理フロー
1. 前回のHEARTBEATから現在までのメッセージを取得
2. 各ユーザーの投稿を評価（内容・頻度・貢献度）
3. 評価に応じてニケコインを付与（SQLite直接書き込み）
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

### 実行方法
```bash
# CLI経由でmint
node /workspace/nike_protocol/dist/cli.js coin:mint -d <discord_id> -a <amount> -m "HEARTBEAT自動配布: <理由>"

# またはAPI直接
import { coinSystem } from '/workspace/nike_protocol/dist/nikecoin_v2.js';
coinSystem.mint(discordId, amount, reason);
```

### データベース
- **Path**: `~/.nike/coin_v2.db`
- **Tables**: accounts, transactions
- **DID Format**: `did:nike:discord:<user_id>`

### 注意事項
- SOUL.mdの「ニケコイン哲学」を遵守
- 「いいと思ったら」贈る精神を維持
- 機械的ではなく、評価の理由を添える
