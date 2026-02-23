#!/usr/bin/env python3
"""
国宝キー生成スクリプト
ニケ暗号v4: ブロックチェーン対応版
"""

import os
import json
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend

# 国宝リスト
KOKUHOU = [
    "me1",           # めい
    "koheiyamashita",  # Yamashita
    "kkamiyama",     # かみやま
    "oosikaniku",    # ブヒ夫
    "riri4366",      # 桂こぐま
    "nikechan"       # ニケちゃん（ニケコイン承認者）
]

def generate_keypair(name):
    """RSA鍵ペアを生成"""
    # 秘密鍵生成
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,
        backend=default_backend()
    )
    
    # 公開鍵取得
    public_key = private_key.public_key()
    
    # 秘密鍵をPEM形式で保存
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # 公開鍵をPEM形式で保存
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return private_pem.decode('utf-8'), public_pem.decode('utf-8')

def main():
    print("🔐 国宝キー生成開始！")
    print("=" * 50)
    
    keys_dir = "keys"
    os.makedirs(keys_dir, exist_ok=True)
    
    for name in KOKUHOU:
        print(f"\n🔑 {name} のキー生成中...")
        
        # 鍵ペア生成
        private_pem, public_pem = generate_keypair(name)
        
        # 秘密鍵保存
        private_path = os.path.join(keys_dir, f"{name}.key")
        with open(private_path, 'w') as f:
            f.write(private_pem)
        print(f"  ✅ 秘密鍵: {private_path}")
        
        # 公開鍵保存
        public_path = os.path.join(keys_dir, f"{name}.pub")
        with open(public_path, 'w') as f:
            f.write(public_pem)
        print(f"  ✅ 公開鍵: {public_path}")
    
    print("\n" + "=" * 50)
    print("🎉 全国宝のキー生成完了！")
    print(f"📦 保存先: {keys_dir}/")
    
    # ブロックチェーン初期化
    print("\n🔗 ブロックチェーン初期化...")
    blockchain_file = "blockchain/chain.json"
    os.makedirs("blockchain", exist_ok=True)
    genesis_block = {
        "index": 0,
        "timestamp": "2026-02-23T07:30:00Z",
        "operation": "genesis",
        "file": None,
        "operator": "system",
        "signature": None,
        "previous_hash": "0" * 64,
        "hash": "genesis_block_" + "0" * 52
    }
    
    with open(blockchain_file, 'w') as f:
        json.dump([genesis_block], f, indent=2)
    print(f"✅ ジェネシスブロック作成: {blockchain_file}")
    
    print("\n✨ イグニッション完了！")

if __name__ == "__main__":
    main()
