---
name: nikecoin
description: ニケコイン管理スキル。残高確認、贈呈、履歴確認、ユーザー登録などの操作を行う。「ニケコイン」「残高」「贈呈」などの指示があった場合に参照する。
allowed-tools: Bash
---

# ニケコイン管理スキル

## 概要

ニケコインはDiscordサーバー内の独自通貨。管理はすべて `skills/nikecoin/nikecoin.py`（Python + SQLite）で行う。

- DB: `skills/nikecoin/nikecoin.db`
- 総発行量: 1,000,000枚
- 流通量: 45枚（2026-02-18時点）

## コマンド

```bash
# 残高確認
python3 skills/nikecoin/nikecoin.py balance <discord_id>

# 全員の残高一覧
python3 skills/nikecoin/nikecoin.py list

# 贈呈（nikeから新規発行）
python3 skills/nikecoin/nikecoin.py give nike <to_discord_id> <amount> "<reason>"

# ユーザー間送金
python3 skills/nikecoin/nikecoin.py give <from_discord_id> <to_discord_id> <amount> "<reason>"

# 取引履歴
python3 skills/nikecoin/nikecoin.py history [limit]

# ユーザー登録
python3 skills/nikecoin/nikecoin.py register <discord_id> <username>
```

## 贈呈ルール

- from_id が `nike` の場合は新規発行（私からの贈呈）
- 受取人が未登録の場合は自動的にusersテーブルに登録される
- ユーザー間送金の場合は送金元の残高が減る（残高不足なら失敗）

## 注意事項

- 贈呈の判断基準や哲学はSOUL.mdに記載
- 残高や取引履歴の改ざんは禁止（DBの直接操作は行わない）
