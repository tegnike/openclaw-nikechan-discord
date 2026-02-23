#!/usr/bin/env python3
"""
ニケ暗号 v4 - ブロックチェーン対応版
国宝署名ベース認証 + 操作ログ + 改ざん検知
"""

import sys
import os
import json
import hashlib
import secrets
from datetime import datetime
from cryptography.hazmat.primitives.asymmetric import rsa, padding as asym_padding
from cryptography.hazmat.primitives import hashes, serialization, padding
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature

# 定数
VERSION = "4.0"
NOISE_MARKER_WORD = "ミカゼちゃん"
NOISE_MARKER_REPEAT = 7
NOISE_PROBABILITY = 1 / (6 ** 9)  # 1/10,077,696

# 国宝リスト
KOKUHOU = [
    "me1",           # めい
    "koheiyamashita",  # Yamashita
    "kkamiyama",     # かみやま
    "oosikaniku",    # ブヒ夫
    "riri4366"       # 桂こぐま
]

# 単語リスト（6種類）
WORDS = ["こと", "もの", "ところ", "ひと", "とき", "ゆめ"]

class BlockchainManager:
    """ブロックチェーン管理クラス（暗号化対応）"""
    
    def __init__(self, blockchain_file="blockchain/chain.enc"):
        self.blockchain_file = blockchain_file
        self.chain = []
    
    def encrypt_chain(self, chain_data, public_key_pem):
        """ブロックチェーンを暗号化（AES + RSA）"""
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.primitives import padding
        
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
            public_key_pem.encode(),
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
    
    def decrypt_chain(self, encrypted_chain, private_key_pem):
        """ブロックチェーンを復号化"""
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.primitives import padding
        
        # 秘密鍵ロード
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode(),
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
    
    def load_chain(self, operator=None, private_key_pem=None):
        """ブロックチェーンをロード（暗号化対応）"""
        if not os.path.exists(self.blockchain_file):
            return []
        
        if operator and private_key_pem:
            # 暗号化されたブロックチェーンを復号化
            with open(self.blockchain_file, 'rb') as f:
                encrypted_chain = f.read()
            
            try:
                chain_data = self.decrypt_chain(encrypted_chain, private_key_pem)
                return json.loads(chain_data.decode('utf-8'))
            except Exception as e:
                raise ValueError(f"ブロックチェーンの復号化に失敗: {e}")
        else:
            # 暗号化前のブロックチェーン（後方互換性）
            json_file = self.blockchain_file.replace('.enc', '.json')
            if os.path.exists(json_file):
                with open(json_file, 'r') as f:
                    return json.load(f)
            return []
    
    def save_chain(self, operator=None, public_key_pem=None):
        """ブロックチェーンを保存（暗号化対応）"""
        chain_data = json.dumps(self.chain).encode('utf-8')
        
        if operator and public_key_pem:
            # 暗号化して保存
            encrypted_chain = self.encrypt_chain(chain_data, public_key_pem)
            with open(self.blockchain_file, 'wb') as f:
                f.write(encrypted_chain)
        else:
            # 平文で保存（後方互換性）
            json_file = self.blockchain_file.replace('.enc', '.json')
            os.makedirs(os.path.dirname(json_file), exist_ok=True)
            with open(json_file, 'w') as f:
                json.dump(self.chain, f, indent=2)
    
    def calculate_hash(self, block):
        """ブロックのハッシュを計算（hashフィールドを除外）"""
        block_copy = block.copy()
        if 'hash' in block_copy:
            del block_copy['hash']
        block_string = json.dumps(block_copy, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def add_block(self, operation, file_path, operator, signature, additional_data=None):
        """新しいブロックを追加"""
        previous_hash = self.chain[-1]["hash"] if self.chain else "0" * 64
        
        block = {
            "index": len(self.chain),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "operation": operation,
            "file": os.path.basename(file_path) if file_path else None,
            "operator": operator,
            "signature": signature,
            "previous_hash": previous_hash,
            "additional_data": additional_data
        }
        
        block["hash"] = self.calculate_hash(block)
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
        
        return True, "Blockchain integrity verified"

class SignatureManager:
    """署名管理クラス"""
    
    def __init__(self, keys_dir="keys"):
        self.keys_dir = keys_dir
    
    def load_private_key(self, operator):
        """秘密鍵をロード"""
        key_path = os.path.join(self.keys_dir, f"{operator}.key")
        if not os.path.exists(key_path):
            raise ValueError(f"Private key not found for {operator}")
        
        with open(key_path, 'r') as f:
            private_key = serialization.load_pem_private_key(
                f.read().encode(),
                password=None,
                backend=default_backend()
            )
        
        return private_key
    
    def load_public_key(self, operator):
        """公開鍵をロード"""
        key_path = os.path.join(self.keys_dir, f"{operator}.pub")
        if not os.path.exists(key_path):
            raise ValueError(f"Public key not found for {operator}")
        
        with open(key_path, 'r') as f:
            public_key = serialization.load_pem_public_key(
                f.read().encode(),
                backend=default_backend()
            )
        
        return public_key
    
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
    
    def sign_data(self, operator, data):
        """データに署名"""
        private_key = self.load_private_key(operator)
        signature = private_key.sign(
            data.encode() if isinstance(data, str) else data,
            asym_padding.PSS(
                mgf=asym_padding.MGF1(hashes.SHA256()),
                salt_length=asym_padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return signature.hex()
    
    def verify_signature(self, operator, data, signature_hex):
        """署名を検証"""
        public_key = self.load_public_key(operator)
        signature = bytes.fromhex(signature_hex)
        
        try:
            public_key.verify(
                signature,
                data.encode() if isinstance(data, str) else data,
                asym_padding.PSS(
                    mgf=asym_padding.MGF1(hashes.SHA256()),
                    salt_length=asym_padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except InvalidSignature:
            return False

class NikeCipherV4:
    """ニケ暗号v4メインクラス"""
    
    def __init__(self, operator=None):
        self.operator = operator
        self.blockchain = BlockchainManager()
        self.signer = SignatureManager()
        
        # 現在のオペレーターの鍵をロード
        if operator:
            self.private_key_pem = self.signer.load_private_key_pem(operator)
            self.public_key_pem = self.signer.load_public_key_pem(operator)
            # ブロックチェーンを復号化してロード
            self.blockchain.chain = self.blockchain.load_chain(operator, self.private_key_pem)
        else:
            self.private_key_pem = None
            self.public_key_pem = None
    
    def derive_key(self, password, salt):
        """PBKDF2でキーを導出"""
        import binascii
        key = hashlib.pbkdf2_hmac(
            'sha512',
            password.encode('utf-8'),
            salt,
            1000000,  # 100万回
            dklen=64
        )
        return key
    
    def text_to_words(self, data_bytes):
        """バイナリデータを単語列に変換（6進数エンコーディング）"""
        # バイト列を整数に変換
        num = int.from_bytes(data_bytes, byteorder='big')
        
        # 6進数に変換
        if num == 0:
            return [WORDS[0]]
        
        digits = []
        while num > 0:
            digits.append(num % 6)
            num //= 6
        
        # 逆順にして単語にマップ
        words = [WORDS[d] for d in reversed(digits)]
        
        return words
    
    def words_to_text(self, words):
        """単語列をバイナリデータに復元（6進数デコーディング）"""
        # 単語を6進数に変換
        num = 0
        for word in words:
            digit = WORDS.index(word)
            num = num * 6 + digit
        
        # 整数をバイト列に変換
        if num == 0:
            return bytes([0])
        
        # 必要なバイト数を計算
        byte_count = (num.bit_length() + 7) // 8
        data_bytes = num.to_bytes(byte_count, byteorder='big')
        
        return data_bytes
    
    def insert_noise(self, words):
        """ノイズを挿入"""
        result = []
        noise_count = 0
        
        for i, word in enumerate(words):
            # 確率的にノイズマーカーを挿入
            if i > 0 and secrets.randbelow(int(1/NOISE_PROBABILITY)) == 0:
                result.append(NOISE_MARKER_WORD)
                for _ in range(NOISE_MARKER_REPEAT):
                    result.append(WORDS[secrets.randbelow(len(WORDS))])
                noise_count += 1
            
            result.append(word)
        
        return result, noise_count
    
    def remove_noise(self, words):
        """ノイズを除去"""
        result = []
        i = 0
        noise_count = 0
        
        while i < len(words):
            # ノイズマーカーを検出
            if words[i] == NOISE_MARKER_WORD:
                # 7連続同じ単語かチェック
                if i + NOISE_MARKER_REPEAT < len(words):
                    is_noise = True
                    first_word = words[i + 1]
                    for j in range(1, NOISE_MARKER_REPEAT + 1):
                        if words[i + j] != first_word:
                            is_noise = False
                            break
                    
                    if is_noise:
                        # ノイズをスキップ
                        i += NOISE_MARKER_REPEAT + 1
                        noise_count += 1
                        continue
            
            result.append(words[i])
            i += 1
        
        return result, noise_count
    
    def encrypt(self, password, input_data, operator):
        """暗号化"""
        # 空ファイルチェック
        if len(input_data) == 0:
            raise ValueError("空ファイルは暗号化できません")
        
        # 国宝チェック
        if operator not in KOKUHOU:
            raise ValueError(f"{operator} は国宝ではありません")
        
        # ソルト生成
        salt = secrets.token_bytes(32)
        
        # キー導出
        key = self.derive_key(password, salt)
        
        # データを3回XOR暗号化
        data = bytearray(input_data)
        for _ in range(3):
            for i in range(len(data)):
                data[i] ^= key[i % len(key)]
        
        # チェックサム計算
        checksum = hashlib.sha256(data).digest()
        
        # チェックサム + 暗号化データを結合
        combined = checksum + bytes(data)
        
        # 単語列に変換
        words = self.text_to_words(combined)
        
        # ノイズ挿入
        words_with_noise, noise_count = self.insert_noise(words)
        
        # 署名
        data_to_sign = " ".join(words_with_noise)
        signature = self.signer.sign_data(operator, data_to_sign)
        
        # ヘッダー作成
        header = {
            "version": VERSION,
            "salt": binascii.hexlify(salt).decode('ascii'),
            "noise_count": noise_count,
            "checksum": binascii.hexlify(checksum).decode('ascii'),
            "operator": operator,
            "signature": signature,
            "combined_length": len(combined)  # combinedの長さを保存
        }
        
        # ブロックチェーンに記録
        self.blockchain.add_block(
            operation="encrypt",
            file_path=None,
            operator=operator,
            signature=signature,
            additional_data={"version": VERSION, "noise_count": noise_count}
        )
        
        # ブロックチェーンを暗号化して保存
        self.blockchain.save_chain(operator, self.public_key_pem)
        
        return header, words_with_noise
    
    def decrypt(self, password, header, words_with_noise, operator):
        """復号化"""
        # バージョンチェック
        if header.get("version") != VERSION:
            raise ValueError(f"バージョン不一致: {header.get('version')} != {VERSION}")
        
        # 国宝チェック
        if operator not in KOKUHOU:
            raise ValueError(f"{operator} は国宝ではありません")
        
        # 署名検証
        data_to_verify = " ".join(words_with_noise)
        if not self.signer.verify_signature(header["operator"], data_to_verify, header["signature"]):
            raise ValueError("署名検証に失敗しました")
        
        # ノイズ除去
        words, removed_noise = self.remove_noise(words_with_noise)
        
        # 単語数チェック（3ビット単位なので、4の倍数チェックは不要）
        # if len(words) % 4 != 0:
        #     raise ValueError(f"単語の数が4の倍数ではありません: {len(words)}個（ノイズ除去後）")
        
        # バイナリデータに復元
        combined = self.words_to_text(words)
        
        # combinedの長さに合わせてトリム（パディング除去）
        combined_length = header.get("combined_length")
        if combined_length and len(combined) > combined_length:
            combined = combined[:combined_length]
        
        # チェックサム分離
        stored_checksum = combined[:32]
        data = combined[32:]
        
        # チェックサム検証
        calculated_checksum = hashlib.sha256(data).digest()
        if stored_checksum != calculated_checksum:
            raise ValueError("チェックサムが一致しません（データが破損している可能性があります）")
        
        # ソルト復元
        salt = binascii.unhexlify(header["salt"])
        
        # キー導出
        key = self.derive_key(password, salt)
        
        # 3回XOR復号化
        data = bytearray(data)
        for _ in range(3):
            for i in range(len(data)):
                data[i] ^= key[i % len(key)]
        
        # ブロックチェーンに記録
        self.blockchain.add_block(
            operation="decrypt",
            file_path=None,
            operator=operator,
            signature=None,
            additional_data={"success": True}
        )
        
        # 元のデータ長にトリム
        combined_length = header.get("combined_length")
        if combined_length and len(bytes(data)) > combined_length:
            data = data[:combined_length]
        
        # ブロックチェーンを暗号化して保存
        self.blockchain.save_chain(operator, self.public_key_pem)
        
        return bytes(data)

def main():
    """メイン関数"""
    if len(sys.argv) < 3:
        print("使用方法:")
        print("  暗号化: python3 nikecipher_v4.py encrypt <password> <operator>")
        print("  復号化: python3 nikecipher_v4.py decrypt <password> <operator>")
        print("  ブロックチェーン検証: python3 nikecipher_v4.py verify <operator>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "verify":
        if len(sys.argv) < 3:
            print("エラー: operator が必要です")
            sys.exit(1)
        
        operator = sys.argv[2]
        cipher = NikeCipherV4(operator)
        
        # ブロックチェーン検証
        is_valid, message = cipher.blockchain.verify_chain()
        if is_valid:
            print(f"✅ {message}")
            print(f"📊 ブロック数: {len(cipher.blockchain.chain)}")
        else:
            print(f"❌ {message}")
            sys.exit(1)
    
    elif command == "encrypt":
        if len(sys.argv) < 4:
            print("エラー: operator が必要です")
            sys.exit(1)
        
        password = sys.argv[2]
        operator = sys.argv[3]
        cipher = NikeCipherV4(operator)
        
        # 標準入力からデータ読み込み
        input_data = sys.stdin.buffer.read()
        
        try:
            header, words = cipher.encrypt(password, input_data, operator)
            
            # ヘッダーを出力
            print(f"### NIKECIPHER_V4_HEADER ###")
            print(json.dumps(header))
            print(f"### NIKECIPHER_V4_DATA ###")
            print(" ".join(words))
            
        except Exception as e:
            print(f"エラー: {e}", file=sys.stderr)
            sys.exit(1)
    
    elif command == "decrypt":
        if len(sys.argv) < 4:
            print("エラー: operator が必要です")
            sys.exit(1)
        
        password = sys.argv[2]
        operator = sys.argv[3]
        cipher = NikeCipherV4(operator)
        
        # 標準入力からデータ読み込み
        lines = sys.stdin.read().split('\n')
        
        # ヘッダーを探す
        header_start = -1
        data_start = -1
        for i, line in enumerate(lines):
            if "### NIKECIPHER_V4_HEADER ###" in line:
                header_start = i
            elif "### NIKECIPHER_V4_DATA ###" in line:
                data_start = i
                break
        
        if header_start == -1 or data_start == -1:
            print("エラー: ヘッダーが見つかりません", file=sys.stderr)
            sys.exit(1)
        
        # ヘッダーをパース
        header = json.loads(lines[header_start + 1])
        
        # データをパース
        words = " ".join(lines[data_start + 1:]).split()
        
        try:
            decrypted = cipher.decrypt(password, header, words, operator)
            sys.stdout.buffer.write(decrypted)
            
        except Exception as e:
            print(f"エラー: {e}", file=sys.stderr)
            sys.exit(1)
    
    else:
        print(f"エラー: 不明なコマンド {command}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    import binascii
    main()
