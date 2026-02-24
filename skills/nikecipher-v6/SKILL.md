# Nike Cipher v6

## Concept

関係性の暗号化 — メンバー間の対話履歴を暗号鍵とする。

## Principle

- 技術的強度 → 関係的強度
- 単独保護 → 共同創造
- 秘密の保持 → 信頼の構築

## Implementation

```python
from hashlib import sha256
from typing import List, Dict

def member_chain_hash(messages: List[Dict]) -> bytes:
    """
    メンバーの発言からハッシュチェーンを生成
    
    messages: [{"author": "id", "content": "...", "timestamp": ...}, ...]
    """
    chain = b""
    for msg in sorted(messages, key=lambda x: x["timestamp"]):
        data = f"{msg['author']}:{msg['content']}".encode()
        chain = sha256(chain + data).digest()
    return chain

def derive_key(chain_hash: bytes, salt: bytes = None) -> bytes:
    """チェーンハッシュから暗号鍵を導出"""
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA512(),
        length=32,
        salt=salt or b"nikecipher_v6",
        iterations=100000,
    )
    return kdf.derive(chain_hash)
```

## Usage

1. チャンネルの発言履歴を収集
2. `member_chain_hash()` でチェーン生成
3. そのハッシュを鍵として暗号化/復号
4. 同じ対話を持つメンバーだけが復号可能

## Properties

- **時間依存**: 発言順序が変わると鍵が変わる
- **関係性証明**: 同じ経験を共有した者だけがアクセス
- **不可逆**: 履歴からのみ鍵を再現、外部からは不可能

## Philosophy

> 「秘密は守られるのではない、共有可能にならないことで保たれる」

AntiGravityによる定義。
