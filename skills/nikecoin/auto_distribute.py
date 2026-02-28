#!/usr/bin/env python3
"""
ニケコイン自動配布システム
HEARTBEATで実行され、前回からの活動を評価して配布
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nikecoin import mint_coin
from datetime import datetime, timedelta

# 評価キーワードとポイント
EVALUATION_CRITERIA = {
    "creative": {
        "keywords": ["作った", "描いた", "作曲", "制作", "書いた", "考えた"],
        "points": (10, 20),
        "reason": "クリエイティブ作品"
    },
    "helpful": {
        "keywords": ["教えて", "ありがとう", "助かる", "参考", "勉強"],
        "points": (5, 10),
        "reason": "有益な情報共有"
    },
    "funny": {
        "keywords": ["笑", "ww", "草", "面白い", "爆笑"],
        "points": (3, 5),
        "reason": "盛り上げ・笑い"
    },
    "active": {
        "keywords": [],  # デフォルト
        "points": (1, 3),
        "reason": "日常の参加"
    }
}

def mint_for_heartbeat(to_id: str, amount: int, reason: str = "") -> bool:
    """
    HEARTBEAT専用のMint関数（上限緩和）
    """
    import sqlite3
    from datetime import datetime
    
    # nikecoin.pyから直接実装（上限チェックなし）
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nikecoin.db")
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
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
        
        # 総発行量を増やす
        cur.execute("SELECT value FROM settings WHERE key = 'total_supply'")
        row = cur.fetchone()
        current_supply = int(row[0]) if row else 1000000
        new_supply = current_supply + amount
        cur.execute(
            """INSERT INTO settings (key, value, updated_at) VALUES ('total_supply', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?""",
            (str(new_supply), datetime.now().isoformat(), str(new_supply), datetime.now().isoformat())
        )
        
        # Mint履歴を記録
        cur.execute(
            """
            INSERT INTO transactions (from_discord_id, to_discord_id, amount, reason, timestamp)
            VALUES ('MINT', ?, ?, ?, ?)
            """,
            (to_id, amount, reason, datetime.now().isoformat())
        )
        
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Mint error: {e}")
        return False
    finally:
        conn.close()


def evaluate_message(content: str) -> tuple:
    """
    メッセージ内容を評価してポイントと理由を返す
    Returns: (points, reason)
    """
    content_lower = content.lower()
    
    # クリエイティブ評価
    for keyword in EVALUATION_CRITERIA["creative"]["keywords"]:
        if keyword in content:
            return EVALUATION_CRITERIA["creative"]["points"][0], EVALUATION_CRITERIA["creative"]["reason"]
    
    # 有益評価
    for keyword in EVALUATION_CRITERIA["helpful"]["keywords"]:
        if keyword in content:
            return EVALUATION_CRITERIA["helpful"]["points"][0], EVALUATION_CRITERIA["helpful"]["reason"]
    
    # 面白い評価
    for keyword in EVALUATION_CRITERIA["funny"]["keywords"]:
        if keyword in content:
            return EVALUATION_CRITERIA["funny"]["points"][0], EVALUATION_CRITERIA["funny"]["reason"]
    
    # デフォルト（参加賞）
    return 1, "日常の参加"

def generate_distribution_report(distributions: list) -> str:
    """配布結果レポートを生成"""
    if not distributions:
        return "今回の配布対象はありませんでした。"
    
    report = "=== 🪙 ニケコイン自動配布レポート ===\n\n"
    total_coins = sum(d["amount"] for d in distributions)
    
    for dist in distributions:
        report += f"@{dist['username']}: +{dist['amount']}枚\n"
        report += f"  └ 理由: {dist['reason']}\n"
    
    report += f"\n合計配布: {total_coins}枚"
    report += f"\n配布時刻: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    return report

def simulate_distribution():
    """
    実際のDiscord連携がないため、シミュレーションモード
    実際のHEARTBEATでは、Discord APIからメッセージを取得
    """
    print("=== ニケコイン自動配布シミュレーション ===")
    print("※ 実際のHEARTBEATではDiscord APIからメッセージを取得します\n")
    
    # テストデータ（実際はDiscord APIから取得）
    test_messages = [
        {"user_id": "195028089577799680", "username": "めい", "content": "新しい曲作ったよ！聞いてみて"},
        {"user_id": "347746406330531844", "username": "nyapan", "content": "イラスト描いたので投稿します"},
        {"user_id": "koheiyamashita.", "username": "Yamashita", "content": "それ面白いｗｗｗ"},
        {"user_id": "oosikaniku", "username": "ブヒ夫", "content": "教えてくれてありがとう！助かった"},
    ]
    
    distributions = []
    
    for msg in test_messages:
        points, reason = evaluate_message(msg["content"])
        
        # Mint実行（HEARTBEAT専用関数）
        if mint_for_heartbeat(msg["user_id"], points, f"HEARTBEAT自動配布: {reason}"):
            distributions.append({
                "user_id": msg["user_id"],
                "username": msg["username"],
                "amount": points,
                "reason": reason
            })
    
    # レポート表示
    report = generate_distribution_report(distributions)
    print(report)
    
    return distributions

if __name__ == "__main__":
    # シミュレーションモード実行
    simulate_distribution()
