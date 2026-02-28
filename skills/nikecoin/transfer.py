#!/usr/bin/env python3
"""
ニケコイン送金システム（ユーザー間）
擬似的流動性の実現
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nikecoin import get_connection, get_balance
from datetime import datetime

def transfer(from_id: str, to_id: str, amount: int, message: str = "") -> dict:
    """
    ユーザー間でコインを送金する
    ※ 管理者承認なしで実行可能（相互評価のため）
    """
    if amount <= 0:
        return {"error": "1枚以上を指定してください"}
    
    # 残高チェック
    balance = get_balance(from_id)
    if balance < amount:
        return {"error": f"残高不足です（所持: {balance}枚）"}
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # 送信者の残高を減らす
        cur.execute(
            "UPDATE balances SET balance = balance - ?, updated_at = ? WHERE discord_id = ?",
            (amount, datetime.now().isoformat(), from_id)
        )
        
        # 受取人が未登録なら自動登録
        cur.execute("SELECT discord_id FROM users WHERE discord_id = ?", (to_id,))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO users (discord_id, username) VALUES (?, ?)",
                (to_id, to_id)
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
        
        # 取引記録
        reason = f"ユーザー間送金: {message}" if message else "ユーザー間送金"
        cur.execute(
            """
            INSERT INTO transactions (from_discord_id, to_discord_id, amount, reason, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """,
            (from_id, to_id, amount, reason, datetime.now().isoformat())
        )
        
        conn.commit()
        return {
            "success": True,
            "amount": amount,
            "from": from_id,
            "to": to_id,
            "message": f"{amount}枚を送金しました！"
        }
        
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}
    finally:
        conn.close()

def request_payment(from_id: str, to_id: str, amount: int, reason: str = "") -> str:
    """支払いリクエストを生成（請求書機能）"""
    return f"""
【支払いリクエスト】
請求元: {from_id}
請求先: {to_id}
金額: {amount}ニケコイン
事由: {reason or '未記入'}

承認する場合: `!pay {from_id} {amount}`
"""

if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 4:
        cmd = sys.argv[1]
        if cmd == "send":
            result = transfer(sys.argv[2], sys.argv[3], int(sys.argv[4]), 
                           sys.argv[5] if len(sys.argv) > 5 else "")
            print(result.get("message") or result.get("error"))
