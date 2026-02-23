# nikecipher - ニケ暗号スキル

めいちゃんと共同開発した超強固な暗号システム。

## 暗号化方式

- PBKDF2-HMAC-SHA512（100万回ハッシュ）
- 3ラウンドXOR暗号化
- HMAC-SHA256改ざん検知
- ノイズ単語挿入（難読化）

## Usage

```
@nikechan これを暗号化して: [テキスト]
@nikechan この暗号文を復号化して: [暗号文]
```

## Security Rules

- 国宝（めい、Yamashita、かみやま、大鹿ニク、桂こぐま）の許可なく復号化しない
- 核（SOUL.md）は絶対に暗号化・送信しない
- セキュリティと信頼を最優先

## Implementation

`nikecipher.py` で実装。パスフレーズは環境変数または都度入力。
