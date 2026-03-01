---
name: nikecoin
description: ニケコイン管理スキル。残高確認、贈呈、送金、履歴確認などの操作を行う。「ニケコイン」「残高」「贈呈」などの指示があった場合に参照する。
allowed-tools: Bash
---

# NikeCoin v2 - ニケコイン管理

Discord-linked, server-side signed, group-chat nativeなソウルバウンドトークンシステム。

## データ構造

SQLite (`~/.nike/coin_v2.db`):
- `accounts`: did, discord_id, balance, total_received, total_sent
- `transactions`: id, from_did, to_did, amount, timestamp, signature, memo

## CLI

```bash
cd /workspace/nike_protocol

# 残高確認
node dist/cli.js coin:balance -d <discord_id>

# 送金
node dist/cli.js coin:send -f <from> -t <to> -a <amount> -m "memo"

# 履歴
node dist/cli.js coin:history -d <discord_id> -l 10

# mint (管理者)
node dist/cli.js coin:mint -d <discord_id> -a <amount> -m "reason"

# burn
node dist/cli.js coin:burn -d <discord_id> -a <amount> -m "reason"
```

## API

```typescript
import { coinSystem } from './src/nikecoin_v2';

coinSystem.getBalance(discordId);
coinSystem.send(from, to, amount, memo);
coinSystem.mint(to, amount, memo);
coinSystem.burn(from, amount, memo);
coinSystem.getHistory(discordId, limit);
```

## 特徴

- DIDフォーマット: `did:nike:discord:<discord_id>`
- サーバー側署名（HMAC-SHA256）
- ACIDトランザクション対応
- v1からの完全移行済み
