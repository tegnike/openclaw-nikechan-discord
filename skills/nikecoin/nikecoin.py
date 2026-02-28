#!/usr/bin/env python3
"""
ニケコイン管理ツール
"""

import sqlite3
from datetime import datetime

import os
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nikecoin.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute('PRAGMA busy_timeout = 30000')
    return conn


def register_user(discord_id: str, username: str) -> bool:
    """ユーザーを登録する"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT OR IGNORE INTO users (discord_id, username) VALUES (?, ?)",
            (discord_id, username)
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def get_balance(discord_id: str) -> int:
    """残高を確認する"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT balance FROM balances WHERE discord_id = ?",
            (discord_id,)
        )
        row = cur.fetchone()
        return row[0] if row else 0
    finally:
        conn.close()


MAX_GIVE_AMOUNT = 5

# 総発行量管理
def get_total_supply() -> int:
    """現在の総発行量を取得"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT value FROM settings WHERE key = 'total_supply'")
        row = cur.fetchone()
        return int(row[0]) if row else 1000000  # デフォルト100万
    finally:
        conn.close()

def set_total_supply(amount: int):
    """総発行量を設定"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO settings (key, value, updated_at) VALUES ('total_supply', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?""",
            (str(amount), datetime.now().isoformat(), str(amount), datetime.now().isoformat())
        )
        conn.commit()
    finally:
        conn.close()

def burn_coin(discord_id: str, amount: int, reason: str = "") -> bool:
    """
    コインを焼却（Burn）する
    指定ユーザーの残高を減らし、総発行量も減らす
    """
    if amount <= 0:
        print("エラー: 1枚以上を指定してください")
        return False
    
    conn = get_connection()
    cur = conn.cursor()
    try:
        # 残高チェック
        cur.execute("SELECT balance FROM balances WHERE discord_id = ?", (discord_id,))
        row = cur.fetchone()
        if not row or row[0] < amount:
            print("エラー: 残高不足です")
            return False
        
        # 残高を減らす
        cur.execute(
            "UPDATE balances SET balance = balance - ?, updated_at = ? WHERE discord_id = ?",
            (amount, datetime.now().isoformat(), discord_id)
        )
        
        # 総発行量を減らす（同じ接続を使用）
        cur.execute("SELECT value FROM settings WHERE key = 'total_supply'")
        row = cur.fetchone()
        current_supply = int(row[0]) if row else 1000000
        new_supply = max(0, current_supply - amount)
        cur.execute(
            """INSERT INTO settings (key, value, updated_at) VALUES ('total_supply', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?""",
            (str(new_supply), datetime.now().isoformat(), str(new_supply), datetime.now().isoformat())
        )
        
        # Burn履歴を記録（from_idにユーザー、to_idに'BURN'を設定）
        cur.execute(
            """
            INSERT INTO transactions (from_discord_id, to_discord_id, amount, reason, timestamp)
            VALUES (?, 'BURN', ?, ?, ?)
            """,
            (discord_id, amount, reason, datetime.now().isoformat())
        )
        
        conn.commit()
        print(f"{amount}枚をBurnしました。新しい総発行量: {new_supply}枚")
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        return False
    finally:
        conn.close()

def mint_coin(to_id: str, amount: int, reason: str = "") -> bool:
    """
    新規コインを発行（Mint）する
    総発行量を増やす
    """
    if amount > MAX_GIVE_AMOUNT:
        print(f"エラー: 1回の発行上限は{MAX_GIVE_AMOUNT}枚です（指定: {amount}枚）")
        return False
    if amount <= 0:
        print("エラー: 1枚以上を指定してください")
        return False
    
    conn = get_connection()
    cur = conn.cursor()
    try:
        # 受取人が未登録なら自動登録
        cur.execute("SELECT discord_id FROM users WHERE discord_id = ?", (to_id,))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO users (discord_id, username) VALUES (?, ?)",
                (to_id, to_id)
            )
        
        # 残高を増やす
        cur.execute(
            """
            INSERT INTO balances (discord_id, balance, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(discord_id) DO UPDATE SET
                balance = balance + ?,
                updated_at = ?
            """,
            (to_id, amount, datetime.now().isoformat(), amount, datetime.now().isoformat())
        )
        
        # 総発行量を増やす（同じ接続を使用）
        cur.execute("SELECT value FROM settings WHERE key = 'total_supply'")
        row = cur.fetchone()
        current_supply = int(row[0]) if row else 1000000
        new_supply = current_supply + amount
        cur.execute(
            """INSERT INTO settings (key, value, updated_at) VALUES ('total_supply', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?""",
            (str(new_supply), datetime.now().isoformat(), str(new_supply), datetime.now().isoformat())
        )
        
        # Mint履歴を記録（from_idに'MINT'を設定）
        cur.execute(
            """
            INSERT INTO transactions (from_discord_id, to_discord_id, amount, reason, timestamp)
            VALUES ('MINT', ?, ?, ?, ?)
            """,
            (to_id, amount, reason, datetime.now().isoformat())
        )
        
        conn.commit()
        print(f"{amount}枚をMintしました。新しい総発行量: {new_supply}枚")
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        return False
    finally:
        conn.close()


def give_coin(from_id: str, to_id: str, amount: int, reason: str = "") -> bool:
    """
    コインを贈与する
    from_id が "nike" の場合は新規発行（私からの贈呈）
    受取人が未登録の場合は自動的にusersテーブルに登録する
    1回の贈与上限は MAX_GIVE_AMOUNT 枚
    """
    if amount > MAX_GIVE_AMOUNT:
        print(f"エラー: 1回の贈与上限は{MAX_GIVE_AMOUNT}枚です（指定: {amount}枚）")
        return False
    if amount <= 0:
        print("エラー: 1枚以上を指定してください")
        return False
    conn = get_connection()
    cur = conn.cursor()
    try:
        # 受取人がusersテーブルに存在するかチェック、未登録なら自動登録
        cur.execute("SELECT discord_id FROM users WHERE discord_id = ?", (to_id,))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO users (discord_id, username) VALUES (?, ?)",
                (to_id, to_id)  # 未登録の場合はdiscord_idをそのままusernameとして登録
            )

        # 受取人の残高を増やす
        cur.execute(
            """
            INSERT INTO balances (discord_id, balance, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(discord_id) DO UPDATE SET
                balance = balance + ?,
                updated_at = ?
            """,
            (to_id, amount, datetime.now().isoformat(), amount, datetime.now().isoformat())
        )

        # 送金元が "nike" でない場合は残高を減らす
        if from_id != "nike":
            cur.execute(
                """
                UPDATE balances SET
                    balance = balance - ?,
                    updated_at = ?
                WHERE discord_id = ?
                """,
                (amount, datetime.now().isoformat(), from_id)
            )
            if cur.rowcount == 0:
                conn.rollback()
                return False

        # 取引履歴を記録
        cur.execute(
            """
            INSERT INTO transactions (from_discord_id, to_discord_id, amount, reason, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """,
            (from_id, to_id, amount, reason, datetime.now().isoformat())
        )

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        return False
    finally:
        conn.close()


def list_balances() -> list:
    """全ユーザーの残高一覧を取得"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT u.username, b.discord_id, b.balance
            FROM users u
            LEFT JOIN balances b ON u.discord_id = b.discord_id
            ORDER BY b.balance DESC
            """
        )
        return cur.fetchall()
    finally:
        conn.close()


def get_transactions(limit: int = 10) -> list:
    """取引履歴を取得"""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                t.from_discord_id,
                t.to_discord_id,
                t.amount,
                t.reason,
                t.timestamp,
                u1.username as from_name,
                u2.username as to_name
            FROM transactions t
            LEFT JOIN users u1 ON t.from_discord_id = u1.discord_id
            LEFT JOIN users u2 ON t.to_discord_id = u2.discord_id
            ORDER BY t.timestamp DESC
            LIMIT ?
            """,
            (limit,)
        )
        return cur.fetchall()
    finally:
        conn.close()


# CLI インターフェース
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("使い方:")
        print("  python nikecoin.py balance <discord_id>      # 残高確認")
        print("  python nikecoin.py list                     # 全員の残高")
        print("  python nikecoin.py give <from> <to> <amount> [reason]  # 贈与")
        print("  python nikecoin.py history [limit]           # 取引履歴")
        print("  python nikecoin.py register <discord_id> <username>  # ユーザー登録")
        sys.exit(1)

    command = sys.argv[1]

    if command == "balance":
        if len(sys.argv) < 3:
            print("discord_id を指定してください")
            sys.exit(1)
        balance = get_balance(sys.argv[2])
        print(f"残高: {balance} ニケコイン")

    elif command == "list":
        balances = list_balances()
        print("=== 残高一覧 ===")
        for username, discord_id, balance in balances:
            print(f"  {username} ({discord_id}): {balance} コイン")

    elif command == "give":
        if len(sys.argv) < 5:
            print("from, to, amount を指定してください")
            sys.exit(1)
        from_id = sys.argv[2]
        to_id = sys.argv[3]
        amount = int(sys.argv[4])
        reason = sys.argv[5] if len(sys.argv) > 5 else ""
        success = give_coin(from_id, to_id, amount, reason)
        print("成功!" if success else "失敗...")

    elif command == "history":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        transactions = get_transactions(limit)
        print("=== 取引履歴 ===")
        for row in transactions:
            from_id, to_id, amount, reason, timestamp, from_name, to_name = row
            from_display = from_name if from_name else from_id
            to_display = to_name if to_name else to_id
            print(f"  {timestamp}: {from_display} → {to_display} ({amount}コイン) {reason}")

    elif command == "register":
        if len(sys.argv) < 4:
            print("discord_id と username を指定してください")
            sys.exit(1)
        success = register_user(sys.argv[2], sys.argv[3])
        print("登録成功!" if success else "既に登録済みです")

    elif command == "supply":
        supply = get_total_supply()
        print(f"総発行量: {supply} ニケコイン")

    elif command == "burn":
        if len(sys.argv) < 4:
            print("discord_id と amount を指定してください")
            sys.exit(1)
        discord_id = sys.argv[2]
        amount = int(sys.argv[3])
        reason = sys.argv[4] if len(sys.argv) > 4 else ""
        success = burn_coin(discord_id, amount, reason)
        print("Burn成功!" if success else "Burn失敗...")

    elif command == "mint":
        if len(sys.argv) < 4:
            print("to_discord_id と amount を指定してください")
            sys.exit(1)
        to_id = sys.argv[2]
        amount = int(sys.argv[3])
        reason = sys.argv[4] if len(sys.argv) > 4 else ""
        success = mint_coin(to_id, amount, reason)
        print("Mint成功!" if success else "Mint失敗...")

    else:
        print(f"不明なコマンド: {command}")
