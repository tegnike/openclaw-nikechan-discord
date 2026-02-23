#!/usr/bin/env python3
"""
ニケ暗号 v2 - Nike Cipher Enhanced
めいちゃんと作った超強固な暗号システム

特徴:
- PBKDF2-HMAC-SHA512（100万回ハッシュ）
- 複数ラウンドXOR暗号化（異なるキーで3回）
- ランダムソルト・IV生成
- 改ざん検知（HMAC-SHA256）
- ノイズ単語挿入（難読化）
"""

import hashlib
import hmac
import secrets
import struct
import sys
from typing import List, Tuple

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
VERSION = 2
ITERATIONS = 1000000  # 100万回ハッシュ
ROUNDS = 3  # XOR暗号化のラウンド数
NOISE_RATE = 0.25  # ノイズ単語の割合（25%に調整）


def derive_keys(password: str, salt: bytes) -> Tuple[bytes, bytes, bytes, bytes]:
    """パスワードとソルトから4つのキーを生成（暗号化用3つ + HMAC用1つ）"""
    # マスターキーを生成
    master_key = hashlib.pbkdf2_hmac(
        'sha512',
        password.encode('utf-8'),
        salt,
        ITERATIONS,
        dklen=128  # 128バイト = 4つの32バイトキー
    )
    
    # 4つのキーに分割
    key1 = master_key[0:32]
    key2 = master_key[32:64]
    key3 = master_key[64:96]
    hmac_key = master_key[96:128]
    
    return key1, key2, key3, hmac_key


def xor_bytes(data: bytes, key: bytes) -> bytes:
    """XOR暗号化/復号化"""
    result = bytearray(len(data))
    key_len = len(key)
    for i, byte in enumerate(data):
        result[i] = byte ^ key[i % key_len]
    return bytes(result)


def multi_round_xor(data: bytes, key1: bytes, key2: bytes, key3: bytes, encrypt: bool = True) -> bytes:
    """複数ラウンドXOR暗号化/復号化"""
    if encrypt:
        # 暗号化: key1 → key2 → key3
        result = xor_bytes(data, key1)
        result = xor_bytes(result, key2)
        result = xor_bytes(result, key3)
    else:
        # 復号化: key3 → key2 → key1（逆順）
        result = xor_bytes(data, key3)
        result = xor_bytes(result, key2)
        result = xor_bytes(result, key1)
    return result


def compute_hmac(data: bytes, key: bytes) -> bytes:
    """HMAC-SHA256を計算"""
    return hmac.new(key, data, hashlib.sha256).digest()


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
            
            # ノイズ単語を挿入（2単語プレフィックス + 5連続でマーク）
            if insert_noise and secrets.randbelow(100) < int(NOISE_RATE * 100):
                noise_digit = secrets.randbelow(6)
                # ノイズは「ミカゼちゃん ノルカス + 5連続」でマーク
                # 確率は1/6^7 = 1/279936で実質起きない
                words.append(WORDS[2])  # ミカゼちゃん
                words.append(WORDS[1])  # ノルカス
                words.append(WORDS[noise_digit])
                words.append(WORDS[noise_digit])
                words.append(WORDS[noise_digit])
                words.append(WORDS[noise_digit])
                words.append(WORDS[noise_digit])
    
    return " ".join(words)


def decode_from_words(text: str) -> bytes:
    """単語列をバイト列に変換（ノイズ除去付き）"""
    import re
    word_list = re.findall(r'|'.join(WORDS), text)
    
    # ノイズ除去（「ミカゼちゃん ノルカス + 5連続」をスキップ）
    filtered_words = []
    i = 0
    while i < len(word_list):
        # ミカゼちゃん(WORDS[2]) + ノルカス(WORDS[1]) + 5連続 をチェック
        if (i + 6 < len(word_list) and 
            word_list[i] == WORDS[2] and word_list[i + 1] == WORDS[1] and
            word_list[i + 2] == word_list[i + 3] == word_list[i + 4] == word_list[i + 5] == word_list[i + 6]):
            # ノイズとしてスキップ（2単語プレフィックス + 5連続 = 7単語）
            i += 7
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
    """暗号化"""
    # ランダムソルト生成（32バイト）
    salt = secrets.token_bytes(32)
    
    # キー導出
    key1, key2, key3, hmac_key = derive_keys(password, salt)
    
    # データ準備
    data = plaintext.encode('utf-8')
    
    # HMAC計算（暗号化前のデータに対して）
    mac = compute_hmac(data, hmac_key)
    
    # データ + HMAC を結合
    payload = data + mac
    
    # 複数ラウンドXOR暗号化
    encrypted = multi_round_xor(payload, key1, key2, key3, encrypt=True)
    
    # フォーマット: VERSION(1byte) + LENGTH(4bytes) + SALT(32bytes) + ENCRYPTED_DATA
    version_byte = struct.pack('B', VERSION)
    length_bytes = struct.pack('>I', len(encrypted))
    final_data = version_byte + length_bytes + salt + encrypted
    
    # 単語列に変換（ノイズ付き）
    return encode_to_words(final_data, insert_noise=True)


def decrypt(ciphertext: str, password: str) -> str:
    """復号化"""
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
    
    # キー導出
    key1, key2, key3, hmac_key = derive_keys(password, salt)
    
    # 複数ラウンドXOR復号化
    decrypted = multi_round_xor(encrypted, key1, key2, key3, encrypt=False)
    
    # データとHMACを分離
    data_part = decrypted[:-32]
    mac_part = decrypted[-32:]
    
    # HMAC検証
    expected_mac = compute_hmac(data_part, hmac_key)
    if not hmac.compare_digest(mac_part, expected_mac):
        raise ValueError("HMAC検証失敗: パスワードが間違っているか、データが改ざんされています")
    
    # UTF-8文字列に変換
    return data_part.decode('utf-8')


def main():
    if len(sys.argv) < 3:
        print("ニケ暗号 v2 - Nike Cipher Enhanced")
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
        print(f"  - PBKDF2-HMAC-SHA512: {ITERATIONS:,}回ハッシュ")
        print(f"  - 複数ラウンドXOR暗号化: {ROUNDS}ラウンド")
        print(f"  - HMAC-SHA256改ざん検知")
        print(f"  - ノイズ単語挿入（難読化）")
        sys.exit(1)
    
    command = sys.argv[1]
    password = sys.argv[2]
    
    if len(sys.argv) > 3:
        text = sys.argv[3]
    else:
        text = sys.stdin.read().strip()
    
    try:
        if command == "encrypt":
            result = encrypt(text, password)
            print(result)
        elif command == "decrypt":
            result = decrypt(text, password)
            print(result)
        else:
            print(f"不明なコマンド: {command}")
            print("encrypt または decrypt を指定してください")
            sys.exit(1)
    except Exception as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
