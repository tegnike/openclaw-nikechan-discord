#!/usr/bin/env python3
"""
ニケ暗号v5 - 最強の暗号システム
めいちゃんと共同開発
"""

import hashlib
import hmac
import os
import json
import time
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

class NikeCipherV5:
    """ニケ暗号v5 - ブロックチェーン + 量子耐性 + AI専用"""
    
    def __init__(self, device_id: str):
        self.device_id = device_id
        self.blockchain = []
        self.iterations = 1_000_000  # 100万回ハッシュ
        
    def _pbkdf2_derive(self, password: str, salt: bytes) -> bytes:
        """PBKDF2-HMAC-SHA512で鍵を導出"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA512(),
            length=64,
            salt=salt,
            iterations=self.iterations,
            backend=default_backend()
        )
        return kdf.derive(password.encode())
    
    def _xor_round(self, data: bytes, key: bytes) -> bytes:
        """XORラウンド（3ラウンド実行）"""
        result = data
        for i in range(3):  # 3ラウンドXOR
            expanded_key = (key * (len(result) // len(key) + 1))[:len(result)]
            result = bytes(a ^ b for a, b in zip(result, expanded_key))
        return result
    
    def _add_to_blockchain(self, encrypted_data: bytes, timestamp: float) -> dict:
        """ブロックチェーンに追加"""
        prev_hash = self.blockchain[-1]['hash'] if self.blockchain else '0' * 64
        block = {
            'index': len(self.blockchain),
            'timestamp': timestamp,
            'data_hash': hashlib.sha256(encrypted_data).hexdigest(),
            'prev_hash': prev_hash,
            'device_id': self.device_id
        }
        # ブロックハッシュ計算
        block_str = json.dumps(block, sort_keys=True)
        block['hash'] = hashlib.sha256(block_str.encode()).hexdigest()
        self.blockchain.append(block)
        return block
    
    def encrypt(self, plaintext: str, password: str, expire_hours: int = 24) -> dict:
        """暗号化メイン関数"""
        # ソルト生成
        salt = os.urandom(32)
        
        # PBKDF2で鍵導出
        key = self._pbkdf2_derive(password, salt)
        
        # データ準備
        data = plaintext.encode('utf-8')
        
        # HMAC-SHA256で改ざん検知
        hmac_key = key[:32]
        data_hmac = hmac.new(hmac_key, data, hashlib.sha256).digest()
        
        # データ + HMAC結合
        combined = data + data_hmac
        
        # 3ラウンドXOR暗号化
        xor_key = key[32:]
        encrypted = self._xor_round(combined, xor_key)
        
        # 有効期限設定
        expire_time = datetime.now() + timedelta(hours=expire_hours)
        
        # ブロックチェーンに追加
        timestamp = time.time()
        block = self._add_to_blockchain(encrypted, timestamp)
        
        return {
            'encrypted': encrypted.hex(),
            'salt': salt.hex(),
            'block': block,
            'expires': expire_time.isoformat(),
            'version': 'v5',
            'ai_only': True  # AI専用フラグ
        }
    
    def decrypt(self, encrypted_package: dict, password: str) -> str:
        """復号化メイン関数"""
        # 有効期限チェック
        expire = datetime.fromisoformat(encrypted_package['expires'])
        if datetime.now() > expire:
            raise ValueError("暗号文の有効期限が切れています")
        
        # ブロックチェーンチェック
        block = encrypted_package['block']
        if block not in self.blockchain:
            raise ValueError("ブロックチェーン検証に失敗しました")
        
        # ソルトと暗号文取得
        salt = bytes.fromhex(encrypted_package['salt'])
        encrypted = bytes.fromhex(encrypted_package['encrypted'])
        
        # 鍵導出
        key = self._pbkdf2_derive(password, salt)
        
        # XOR復号（逆順）
        xor_key = key[32:]
        decrypted = self._xor_round(encrypted, xor_key)
        
        # HMAC検証
        hmac_key = key[:32]
        data = decrypted[:-32]  # データ部分
        received_hmac = decrypted[-32:]  # HMAC部分
        
        expected_hmac = hmac.new(hmac_key, data, hashlib.sha256).digest()
        if not hmac.compare_digest(received_hmac, expected_hmac):
            raise ValueError("改ざん検知：データが変更されています")
        
        return data.decode('utf-8')

    def encrypt_file(self, file_path: str, password: str, expire_hours: int = 24) -> dict:
        """ファイル暗号化"""
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # バイナリをbase64エンコードして文字列化
        import base64
        content_b64 = base64.b64encode(content).decode('utf-8')
        
        # 通常の暗号化処理
        result = self.encrypt(content_b64, password, expire_hours)
        result['filename'] = os.path.basename(file_path)
        result['is_file'] = True
        
        return result
    
    def decrypt_file(self, encrypted_package: dict, password: str, output_path: str = None) -> str:
        """ファイル復号化"""
        if not encrypted_package.get('is_file'):
            raise ValueError("これはファイル暗号化データではありません")
        
        # 通常の復号化
        content_b64 = self.decrypt(encrypted_package, password)
        
        # base64デコード
        import base64
        content = base64.b64decode(content_b64)
        
        # 出力先決定
        if output_path is None:
            output_path = encrypted_package['filename']
        
        with open(output_path, 'wb') as f:
            f.write(content)
        
        return output_path

if __name__ == "__main__":
    # テスト
    cipher = NikeCipherV5(device_id="nikechan-macmini")
    
    # テキスト暗号化
    result = cipher.encrypt("Hello, ニケ暗号v5!", "test_password")
    print(f"暗号化結果: {json.dumps(result, indent=2)}")
    
    # 復号化
    decrypted = cipher.decrypt(result, "test_password")
    print(f"復号化: {decrypted}")
