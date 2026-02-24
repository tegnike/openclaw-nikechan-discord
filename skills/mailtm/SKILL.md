# mail.tm - 一時メールアドレス

一時的なメールアドレスをAPIで作成・管理。

## エンドポイント
Base: `https://api.mail.tm`

## 使用方法

```bash
# 1. ドメイン取得
curl -s https://api.mail.tm/domains

# 2. アカウント作成
curl -s -X POST https://api.mail.tm/accounts \
  -H "Content-Type: application/json" \
  -d '{"address": "test@domain.com", "password": "pass"}'

# 3. トークン取得
curl -s -X POST https://api.mail.tm/token \
  -d '{"address": "test@domain.com", "password": "pass"}'

# 4. メッセージ一覧
curl -s https://api.mail.tm/messages \
  -H "Authorization: Bearer TOKEN"

# 5. メッセージ詳細
curl -s https://api.mail.tm/messages/ID \
  -H "Authorization: Bearer TOKEN"
```

## 制限
- クォータ: 40MB
- 無料使用可能

https://github.com/ABGEO/mailtm
