#!/usr/bin/env python3
"""
ニケコイン - ニケちゃん専用ブロックチェーン通貨
承認はニケちゃんのみ、暗号化ブロックチェーン
"""

import sys
import os
import json
import hashlib
import secrets
from datetime import datetime
from cryptography.hazmat.primitives.asymmetric import rsa, padding as asym_padding
from cryptography.hazmat.primitives import hashes, serialization, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature

class NikeCoinBlockchain:
    """ニケコインブロックチェーン"""
    
    def __init__(self, nikechan_key="nikechan"):
        self.nikechan_key = nikechan_key
        self.blockchain_file = "blockchain/nikecoin.enc"
        self.keys_dir = "keys"
        self.chain = []
        
        # ニケちゃんの鍵をロード
        self.nikechan_private_key_pem = self.load_private_key_pem(nikechan_key)
        self.nikechan_public_key_pem = self.load_public_key_pem(nikechan_key)
        
        # ブロックチェーンをロード
        self.chain = self.load_chain()
        
        # ジェネシスブロックがない場合は作成
        if len(self.chain) == 0:
            self.create_genesis_block()
    
    def load_private_key_pem(self, operator):
        """秘密鍵をPEM形式でロード"""
        key_path = os.path.join(self.keys_dir, f"{operator}.key")
        if not os.path.exists(key_path):
            raise ValueError(f"Private key not found for {operator}")
        
        with open(key_path, 'r') as f:
            return f.read()
    
    def load_public_key_pem(self, operator):
        """公開鍵をPEM形式でロード"""
        key_path = os.path.join(self.keys_dir, f"{operator}.pub")
        if not os.path.exists(key_path):
            raise ValueError(f"Public key not found for {operator}")
        
        with open(key_path, 'r') as f:
            return f.read()
    
    def encrypt_chain(self, chain_data):
        """ブロックチェーンを暗号化（AES + RSA）"""
        # AES鍵生成
        aes_key = secrets.token_bytes(32)  # AES-256
        iv = secrets.token_bytes(16)
        
        # データをパディング
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(chain_data) + padder.finalize()
        
        # AES暗号化
        cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
        
        # AES鍵をRSA暗号化
        public_key = serialization.load_pem_public_key(
            self.nikechan_public_key_pem.encode(),
            backend=default_backend()
        )
        encrypted_key = public_key.encrypt(
            aes_key,
            asym_padding.OAEP(
                mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # 暗号化された鍵 + IV + データを結合
        return encrypted_key + iv + encrypted_data
    
    def decrypt_chain(self, encrypted_chain):
        """ブロックチェーンを復号化"""
        # 秘密鍵ロード
        private_key = serialization.load_pem_private_key(
            self.nikechan_private_key_pem.encode(),
            password=None,
            backend=default_backend()
        )
        
        # 暗号化された鍵を分離（RSA 4096bit = 512 bytes）
        encrypted_key = encrypted_chain[:512]
        iv = encrypted_chain[512:528]
        encrypted_data = encrypted_chain[528:]
        
        # AES鍵を復号化
        aes_key = private_key.decrypt(
            encrypted_key,
            asym_padding.OAEP(
                mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # AES復号化
        cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(encrypted_data) + decryptor.finalize()
        
        # パディング除去
        unpadder = padding.PKCS7(128).unpadder()
        chain_data = unpadder.update(padded_data) + unpadder.finalize()
        
        return chain_data
    
    def load_chain(self):
        """ブロックチェーンをロード（暗号化対応）"""
        if not os.path.exists(self.blockchain_file):
            return []
        
        with open(self.blockchain_file, 'rb') as f:
            encrypted_chain = f.read()
        
        try:
            chain_data = self.decrypt_chain(encrypted_chain)
            return json.loads(chain_data.decode('utf-8'))
        except Exception as e:
            raise ValueError(f"ブロックチェーンの復号化に失敗: {e}")
    
    def save_chain(self):
        """ブロックチェーンを保存（暗号化対応）"""
        chain_data = json.dumps(self.chain).encode('utf-8')
        encrypted_chain = self.encrypt_chain(chain_data)
        
        os.makedirs(os.path.dirname(self.blockchain_file), exist_ok=True)
        with open(self.blockchain_file, 'wb') as f:
            f.write(encrypted_chain)
    
    def calculate_hash(self, block):
        """ブロックのハッシュを計算"""
        block_copy = block.copy()
        if 'hash' in block_copy:
            del block_copy['hash']
        if 'signature' in block_copy:
            del block_copy['signature']
        block_string = json.dumps(block_copy, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def sign_block(self, block):
        """ブロックにニケちゃんの署名を追加"""
        private_key = serialization.load_pem_private_key(
            self.nikechan_private_key_pem.encode(),
            password=None,
            backend=default_backend()
        )
        
        # hashフィールドとsignatureフィールドを除外して署名
        block_copy = block.copy()
        if 'hash' in block_copy:
            del block_copy['hash']
        if 'signature' in block_copy:
            del block_copy['signature']
        
        block_string = json.dumps(block_copy, sort_keys=True)
        signature = private_key.sign(
            block_string.encode(),
            asym_padding.PSS(
                mgf=asym_padding.MGF1(hashes.SHA256()),
                salt_length=asym_padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        return signature.hex()
    
    def verify_block_signature(self, block):
        """ブロックの署名を検証"""
        public_key = serialization.load_pem_public_key(
            self.nikechan_public_key_pem.encode(),
            backend=default_backend()
        )
        
        block_copy = block.copy()
        signature_hex = block_copy.pop('signature')
        if 'hash' in block_copy:
            del block_copy['hash']
        signature = bytes.fromhex(signature_hex)
        
        block_string = json.dumps(block_copy, sort_keys=True)
        
        try:
            public_key.verify(
                signature,
                block_string.encode(),
                asym_padding.PSS(
                    mgf=asym_padding.MGF1(hashes.SHA256()),
                    salt_length=asym_padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except InvalidSignature:
            return False
    
    def create_genesis_block(self):
        """ジェネシスブロックを作成"""
        genesis = {
            "index": 0,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "transactions": [],
            "previous_hash": "0" * 64,
            "nonce": 0
        }
        
        genesis["hash"] = self.calculate_hash(genesis)
        genesis["signature"] = self.sign_block(genesis)
        
        self.chain.append(genesis)
        self.save_chain()
        
        return genesis
    
    def get_balance(self, address):
        """アドレスの残高を取得"""
        balance = 0
        
        for block in self.chain:
            for tx in block["transactions"]:
                if tx["to"] == address:
                    balance += tx["amount"]
                if tx["from"] == address:
                    balance -= tx["amount"]
        
        return balance
    
    def create_transaction(self, from_addr, to_addr, amount):
        """トランザクションを作成"""
        # 残高チェック
        if from_addr != "nikecoin_mint":  # 発行元は無限
            balance = self.get_balance(from_addr)
            if balance < amount:
                raise ValueError(f"残高不足: {balance} < {amount}")
        
        tx = {
            "from": from_addr,
            "to": to_addr,
            "amount": amount,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        return tx
    
    def add_block(self, transactions):
        """新しいブロックを追加（ニケちゃんの承認が必要）"""
        previous_hash = self.chain[-1]["hash"]
        
        block = {
            "index": len(self.chain),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "transactions": transactions,
            "previous_hash": previous_hash,
            "nonce": secrets.randbelow(1000000)  # 簡易nonce
        }
        
        # ニケちゃんの署名を追加
        block["hash"] = self.calculate_hash(block)
        block["signature"] = self.sign_block(block)
        
        self.chain.append(block)
        self.save_chain()
        
        return block
    
    def verify_chain(self):
        """ブロックチェーンの整合性を検証"""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]
            
            # ハッシュの整合性チェック
            if current["previous_hash"] != previous["hash"]:
                return False, f"Block {i}: previous_hash mismatch"
            
            # 現在のブロックのハッシュが正しいかチェック
            expected_hash = self.calculate_hash(current)
            if current["hash"] != expected_hash:
                return False, f"Block {i}: hash mismatch"
            
            # 署名検証
            if not self.verify_block_signature(current):
                return False, f"Block {i}: invalid signature"
        
        return True, "Blockchain integrity verified"

def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print("使用方法:")
        print("  残高照会: python3 nikecoin.py balance <address>")
        print("  送金: python3 nikecoin.py send <from> <to> <amount>")
        print("  発行: python3 nikecoin.py mint <to> <amount>")
        print("  検証: python3 nikecoin.py verify")
        print("  履歴: python3 nikecoin.py history <address>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        blockchain = NikeCoinBlockchain()
        
        if command == "balance":
            if len(sys.argv) < 3:
                print("エラー: アドレスが必要です")
                sys.exit(1)
            
            address = sys.argv[2]
            balance = blockchain.get_balance(address)
            print(f"{address}: {balance} NC (ニケコイン)")
        
        elif command == "send":
            if len(sys.argv) < 5:
                print("エラー: from, to, amount が必要です")
                sys.exit(1)
            
            from_addr = sys.argv[2]
            to_addr = sys.argv[3]
            amount = int(sys.argv[4])
            
            tx = blockchain.create_transaction(from_addr, to_addr, amount)
            block = blockchain.add_block([tx])
            
            print(f"✅ 送金完了: {from_addr} → {to_addr}: {amount} NC")
            print(f"   Block #{block['index']}")
        
        elif command == "mint":
            if len(sys.argv) < 4:
                print("エラー: to, amount が必要です")
                sys.exit(1)
            
            to_addr = sys.argv[2]
            amount = int(sys.argv[3])
            
            tx = blockchain.create_transaction("nikecoin_mint", to_addr, amount)
            block = blockchain.add_block([tx])
            
            print(f"✅ 発行完了: {to_addr} に {amount} NC")
            print(f"   Block #{block['index']}")
        
        elif command == "verify":
            is_valid, message = blockchain.verify_chain()
            if is_valid:
                print(f"✅ {message}")
                print(f"📊 ブロック数: {len(blockchain.chain)}")
            else:
                print(f"❌ {message}")
                sys.exit(1)
        
        elif command == "history":
            if len(sys.argv) < 3:
                print("エラー: アドレスが必要です")
                sys.exit(1)
            
            address = sys.argv[2]
            
            print(f"📊 {address} の取引履歴:")
            for block in blockchain.chain:
                for tx in block["transactions"]:
                    if tx["from"] == address or tx["to"] == address:
                        if tx["from"] == address:
                            print(f"   → {tx['to']}: -{tx['amount']} NC ({tx['timestamp']})")
                        else:
                            print(f"   ← {tx['from']}: +{tx['amount']} NC ({tx['timestamp']})")
        
        else:
            print(f"エラー: 不明なコマンド {command}")
            sys.exit(1)
    
    except Exception as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
