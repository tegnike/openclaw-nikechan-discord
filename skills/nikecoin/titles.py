#!/usr/bin/env python3
"""
ニケコイン称号システム
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nikecoin import get_connection, burn_coin
from datetime import datetime

# 購入可能な称号リスト
BUYABLE_TITLES = {
    "collector": {"name": "コレクター", "desc": "ガチャマスター", "cost": 100},
    "whale": {"name": "クジラ", "desc": "大富豪の証", "cost": 200},
    "burner": {"name": "燃やし屋", "desc": "Burnの達人", "cost": 150},
    "gambler": {"name": "ギャンブラー", "desc": "運試し好き", "cost": 80},
    "philanthropist": {"name": "慈善家", "desc": "贈りのプロ", "cost": 120},
}

def init_titles_table():
    """称号テーブル初期化"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_titles (
            discord_id TEXT,
            title_key TEXT,
            acquired_at TEXT,
            PRIMARY KEY (discord_id, title_key)
        )
    """)
    conn.commit()
    conn.close()

def buy_title(discord_id: str, title_key: str) -> dict:
    """称号を購入"""
    if title_key not in BUYABLE_TITLES:
        return {"error": "存在しない称号です"}
    
    title = BUYABLE_TITLES[title_key]
    
    # 既に所持しているかチェック
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM user_titles WHERE discord_id = ? AND title_key = ?",
        (discord_id, title_key)
    )
    if cur.fetchone():
        conn.close()
        return {"error": "既に所持しています"}
    conn.close()
    
    # Burnして購入
    if burn_coin(discord_id, title["cost"], f"称号購入: {title['name']}"):
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO user_titles VALUES (?, ?, ?)",
            (discord_id, title_key, datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
        return {
            "success": True,
            "title": title["name"],
            "desc": title["desc"],
            "message": f"『{title['name']}』の称号を獲得！"
        }
    else:
        return {"error": "購入に失敗しました"}

def list_user_titles(discord_id: str) -> list:
    """ユーザーの所持称号一覧"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT title_key FROM user_titles WHERE discord_id = ?",
        (discord_id,)
    )
    titles = [row[0] for row in cur.fetchall()]
    conn.close()
    return titles

def show_shop():
    """称号ショップ表示"""
    print("=== 称号ショップ ===")
    for key, info in BUYABLE_TITLES.items():
        print(f"[{key}] {info['name']} - {info['cost']}枚")
        print(f"    {info['desc']}")

if __name__ == "__main__":
    import sys
    init_titles_table()
    
    if len(sys.argv) >= 2:
        cmd = sys.argv[1]
        if cmd == "shop":
            show_shop()
        elif cmd == "buy" and len(sys.argv) >= 4:
            result = buy_title(sys.argv[2], sys.argv[3])
            print(result.get("message") or result.get("error"))
        elif cmd == "list" and len(sys.argv) >= 3:
            titles = list_user_titles(sys.argv[2])
            print(f"所持称号: {', '.join(titles) if titles else 'なし'}")
