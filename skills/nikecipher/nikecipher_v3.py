#!/usr/bin/env python3
"""
ニケ暗号 v3 - Nike Cipher Ultra
めいちゃんと作った超超強固な暗号システム

特徴:
- Argon2id（メモリハード関数、GPU/ASIC攻撃耐性）
- AES-256-GCM（認証付き暗号化）
- ChaCha20-Poly1305（認証付き暗号化）
- 二重暗号化（AES + ChaCha）
- ノイズ単語挿入（難読化）
"""

import hashlib
import hmac
import secrets
import struct
import sys
from typing import List, Tuple

# 追加ライブラリ
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
from argon2.low_level import hash_secret_raw, Type

# 単語リスト（6進数の0-5に対応）
WORDS = [
    "AIニケちゃん",  # 0
    "ノルカス",      # 1
    "ミカゼちゃん",  # 2
    "ニケちゃん",    # 3
    "ぷにけ",        # 4
    "ブヒ夫",        # 5
]

WORD_TO_DIGIT = {word: i for i, word in enumerate(WORDS)}

# 定数
VERSION = 3
NOISE_RATE = 0.30  # ノイズ単語の割合（30%）
NOISE_CONSECUTIVE = 7  # ノイズマーカーの連続数（v2の5から7に増加）

# Argon2パラメータ（超強力）
ARGON2_TIME_COST = 4  # 反復回数
ARGON2_MEMORY_COST = 102400  # 100MB（メモリ使用量）
ARGON2_PARALLELISM = 8  # 並列度
ARGON2_HASH_LEN = 96  # 3つの32バイトキー（AES、ChaCha、HMAC用）


def derive_keys_argon2(password: str, salt: bytes) -> Tuple[bytes, bytes, bytes]:
    """Argon2idで3つのキーを生成（AES用、ChaCha用、HMAC用）"""
    master_key = hash_secret_raw(
        secret=password.encode('utf-8'),
        salt=salt,
        time_cost=ARGON2_TIME_COST,
        memory_cost=ARGON2_MEMORY_COST,
        parallelism=ARGON2_PARALLELISM,
        hash_len=ARGON2_HASH_LEN,
        type=Type.ID
    )
    
    # 3つのキーに分割
    aes_key = master_key[0:32]
    chacha_key = master_key[32:64]
    hmac_key = master_key[64:96]
    
    return aes_key, chacha_key, hmac_key


def encrypt_aes_gcm(data: bytes, key: bytes) -> bytes:
    """AES-256-GCMで暗号化"""
    nonce = secrets.token_bytes(12)  # 96ビットnonce
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce + ciphertext


def decrypt_aes_gcm(data: bytes, key: bytes) -> bytes:
    """AES-256-GCMで復号化"""
    nonce = data[:12]
    ciphertext = data[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)


def encrypt_chacha(data: bytes, key: bytes) -> bytes:
    """ChaCha20-Poly1305で暗号化"""
    nonce = secrets.token_bytes(12)  # 96ビットnonce
    chacha = ChaCha20Poly1305(key)
    ciphertext = chacha.encrypt(nonce, data, None)
    return nonce + ciphertext


def decrypt_chacha(data: bytes, key: bytes) -> bytes:
    """ChaCha20-Poly1305で復号化"""
    nonce = data[:12]
    ciphertext = data[12:]
    chacha = ChaCha20Poly1305(key)
    return chacha.decrypt(nonce, ciphertext, None)


def compute_hmac(data: bytes, key: bytes) -> bytes:
    """HMAC-SHA512を計算"""
    return hmac.new(key, data, hashlib.sha512).digest()


def byte_to_base6(byte: int) -> List[int]:
    """1バイトを6進数の桁リストに変換（4桁、0-5）"""
    digits = []
    for _ in range(4):
        digits.append(byte % 6)
        byte //= 6
    return digits[::-1]


def base6_to_byte(digits: List[int]) -> int:
    """6進数の桁リスト（4桁）を1バイトに変換"""
    result = 0
    for digit in digits:
        result = result * 6 + digit
    return result


def encode_to_words(data: bytes, insert_noise: bool = True) -> str:
    """バイト列を単語列に変換（ノイズ挿入付き）"""
    words = []
    
    for byte in data:
        digits = byte_to_base6(byte)
        for digit in digits:
            words.append(WORDS[digit])
            
            # ノイズ単語を挿入（2単語プレフィックス + 7連続でマーク）
            if insert_noise and secrets.randbelow(100) < int(NOISE_RATE * 100):
                noise_digit = secrets.randbelow(6)
                # ノイズは「ミカゼちゃん ノルカス + 7連続」でマーク
                # 確率は1/6^9 = 1/10,077,696で実質誤検出なし
                words.append(WORDS[2])  # ミカゼちゃん
                words.append(WORDS[1])  # ノルカス
                for _ in range(NOISE_CONSECUTIVE):
                    words.append(WORDS[noise_digit])
    
    return " ".join(words)


def decode_from_words(text: str) -> bytes:
    """単語列をバイト列に変換（ノイズ除去付き）"""
    import re
    word_list = re.findall(r'|'.join(WORDS), text)
    
    # ノイズ除去（「ミカゼちゃん ノルカス + 7連続」をスキップ）
    filtered_words = []
    i = 0
    while i < len(word_list):
        # ミカゼちゃん(WORDS[2]) + ノルカス(WORDS[1]) + 7連続 をチェック
        if (i + NOISE_CONSECUTIVE + 1 < len(word_list) and 
            word_list[i] == WORDS[2] and word_list[i + 1] == WORDS[1]):
            # 7連続チェック
            is_noise = True
            noise_word = word_list[i + 2]
            for j in range(NOISE_CONSECUTIVE):
                if word_list[i + 2 + j] != noise_word:
                    is_noise = False
                    break
            if is_noise:
                # ノイズとしてスキップ（2単語プレフィックス + 7連続 = 9単語）
                i += 2 + NOISE_CONSECUTIVE
                continue
        filtered_words.append(word_list[i])
        i += 1
    
    if len(filtered_words) % 4 != 0:
        raise ValueError(f"単語の数が4の倍数ではありません: {len(filtered_words)}個（ノイズ除去後）")
    
    digits = []
    for word in filtered_words:
        if word not in WORD_TO_DIGIT:
            raise ValueError(f"不明な単語: {word}")
        digits.append(WORD_TO_DIGIT[word])
    
    result = bytearray()
    for i in range(0, len(digits), 4):
        byte_digits = digits[i:i+4]
        result.append(base6_to_byte(byte_digits))
    
    return bytes(result)


def encrypt(plaintext: str, password: str) -> str:
    """暗号化（二重暗号化: AES-256-GCM + ChaCha20-Poly1305 + チェックサム）"""
    # 空ファイルチェック（ただし改行のみは許可）
    if not plaintext:
        raise ValueError("空ファイルは暗号化できません")
    
    # ランダムソルト生成（32バイト）
    salt = secrets.token_bytes(32)
    
    # Argon2idでキー導出
    aes_key, chacha_key, hmac_key = derive_keys_argon2(password, salt)
    
    # データ準備
    data = plaintext.encode('utf-8')
    
    # SHA256チェックサムを追加（データ整合性チェック用）
    checksum = hashlib.sha256(data).digest()
    
    # HMAC計算（暗号化前のデータに対して）
    mac = compute_hmac(data, hmac_key)
    
    # チェックサム + データ + HMAC を結合
    payload = checksum + data + mac
    
    # 第一段階: AES-256-GCM暗号化
    aes_encrypted = encrypt_aes_gcm(payload, aes_key)
    
    # 第二段階: ChaCha20-Poly1305暗号化
    double_encrypted = encrypt_chacha(aes_encrypted, chacha_key)
    
    # フォーマット: VERSION(1byte) + LENGTH(4bytes) + SALT(32bytes) + ENCRYPTED_DATA
    version_byte = struct.pack('B', VERSION)
    length_bytes = struct.pack('>I', len(double_encrypted))
    final_data = version_byte + length_bytes + salt + double_encrypted
    
    # 単語列に変換（ノイズ付き）
    return encode_to_words(final_data, insert_noise=True)


def decrypt(ciphertext: str, password: str) -> str:
    """復号化（二重復号化: ChaCha20-Poly1305 + AES-256-GCM + チェックサム検証）"""
    # 単語列をバイト列に変換（ノイズ除去）
    try:
        data = decode_from_words(ciphertext)
    except Exception as e:
        raise ValueError(f"単語列のデコードに失敗: {e}")
    
    # フォーマット解析
    if len(data) < 37:  # 1 + 4 + 32 = 37
        raise ValueError("データが短すぎます")
    
    version = struct.unpack('B', data[0:1])[0]
    if version != VERSION:
        raise ValueError(f"バージョン不一致: {version} (期待値: {VERSION})")
    
    length = struct.unpack('>I', data[1:5])[0]
    salt = data[5:37]
    encrypted = data[37:37+length]
    
    if len(encrypted) != length:
        raise ValueError(f"データ長が不一致: {len(encrypted)} != {length}")
    
    # Argon2idでキー導出
    aes_key, chacha_key, hmac_key = derive_keys_argon2(password, salt)
    
    try:
        # 第一段階: ChaCha20-Poly1305復号化
        aes_encrypted = decrypt_chacha(encrypted, chacha_key)
        
        # 第二段階: AES-256-GCM復号化
        decrypted = decrypt_aes_gcm(aes_encrypted, aes_key)
    except Exception as e:
        raise ValueError(f"復号化失敗: {e}")
    
    # チェックサム、データ、HMACを分離
    if len(decrypted) < 96:  # 32(checksum) + 1(data) + 64(hmac) = 97
        raise ValueError("復号化データが短すぎます")
    
    checksum_part = decrypted[:32]
    data_part = decrypted[32:-64]
    mac_part = decrypted[-64:]
    
    # HMAC検証
    expected_mac = compute_hmac(data_part, hmac_key)
    if not hmac.compare_digest(mac_part, expected_mac):
        raise ValueError("HMAC検証失敗: パスワードが間違っているか、データが改ざんされています")
    
    # SHA256チェックサム検証
    expected_checksum = hashlib.sha256(data_part).digest()
    if not hmac.compare_digest(checksum_part, expected_checksum):
        raise ValueError("チェックサム検証失敗: データが破損しています")
    
    # UTF-8文字列に変換
    return data_part.decode('utf-8')


def main():
    if len(sys.argv) < 3:
        print("ニケ暗号 v3 - Nike Cipher Ultra")
        print()
        print("使い方:")
        print(f"  暗号化: {sys.argv[0]} encrypt <パスワード> [テキスト]")
        print(f"  復号化: {sys.argv[0]} decrypt <パスワード> [テキスト]")
        print()
        print("テキストを省略すると標準入力から読み込みます")
        print()
        print("単語リスト:")
        for i, word in enumerate(WORDS):
            print(f"  {i}: {word}")
        print()
        print("セキュリティ:")
        print(f"  - Argon2id: time_cost={ARGON2_TIME_COST}, memory_cost={ARGON2_MEMORY_COST}KB, parallelism={ARGON2_PARALLELISM}")
        print(f"  - AES-256-GCM（認証付き暗号化）")
        print(f"  - ChaCha20-Poly1305（認証付き暗号化）")
        print(f"  - 二重暗号化（AES + ChaCha）")
        print(f"  - HMAC-SHA512改ざん検知")
        print(f"  - ノイズ単語挿入（難読化、{int(NOISE_RATE * 100)}%）")
        sys.exit(1)
    
    command = sys.argv[1]
    password = sys.argv[2]
    
    if len(sys.argv) > 3:
        text = sys.argv[3]
    else:
        text = sys.stdin.read()
    
    try:
        if command == "encrypt":
            result = encrypt(text, password)
            print(result, end='')
        elif command == "decrypt":
            result = decrypt(text, password)
            print(result, end='')
        else:
            print(f"不明なコマンド: {command}")
            print("encrypt または decrypt を指定してください")
            sys.exit(1)
    except Exception as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
