#!/usr/bin/env python3
"""
ニケコイン管理ツール
"""

import sqlite3
from datetime import datetime

DB_PATH = "nikecoin/nikecoin.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


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


def give_coin(from_id: str, to_id: str, amount: int, reason: str = "") -> bool:
    """
    コインを贈与する
    from_id が "nike" の場合は新規発行（私からの贈呈）
    受取人が未登録の場合は自動的にusersテーブルに登録する
    """
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

    else:
        print(f"不明なコマンド: {command}")
