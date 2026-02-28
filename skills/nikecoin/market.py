#!/usr/bin/env python3
"""
ニケコイン市場システム
時価変動・希少性管理
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nikecoin import get_total_supply, get_connection
from datetime import datetime, timedelta

def calculate_rarity_score() -> dict:
    """
    現在の希少性スコアを計算
    総発行量と流通量から算出
    """
    total = get_total_supply()
    
    conn = get_connection()
    cur = conn.cursor()
    
    # 実際の保有量合計
    cur.execute("SELECT SUM(balance) FROM balances")
    circulating = cur.fetchone()[0] or 0
    
    # Burnされた累計
    cur.execute("SELECT SUM(amount) FROM transactions WHERE to_discord_id = 'BURN'")
    burned = cur.fetchone()[0] or 0
    
    conn.close()
    
    # 希少性計算（Burn率が高いほどレア）
    burn_rate = burned / (burned + circulating) if (burned + circulating) > 0 else 0
    scarcity = min(100, int(burn_rate * 200))  # 最大100%
    
    return {
        "total_supply": total,
        "circulating": circulating,
        "burned": burned,
        "burn_rate": round(burn_rate * 100, 2),
        "scarcity_score": scarcity,
        "market_status": get_market_status(scarcity)
    }

def get_market_status(scarcity: int) -> str:
    """希少性に応じた市場状態"""
    if scarcity >= 80:
        return "🔥 超レア市場 - コインは至宝"
    elif scarcity >= 60:
        return "✨ 高レア市場 - 価値急騰中"
    elif scarcity >= 40:
        return "📈 堅調 - 適正価格帯"
    elif scarcity >= 20:
        return "📊 通常市場 - 安定供給"
    else:
        return "🌊 インフレ傾向 - 供給過多"

def get_gacha_bonus(scarcity: int) -> float:
    """希少性に応じたガチャボーナス倍率"""
    if scarcity >= 80:
        return 2.0  # SSR出現率2倍
    elif scarcity >= 60:
        return 1.5
    elif scarcity >= 40:
        return 1.2
    else:
        return 1.0

def show_market_report():
    """市場レポート表示"""
    report = calculate_rarity_score()
    
    print("=== ニケコイン市場レポート ===")
    print(f"総発行量: {report['total_supply']:,}枚")
    print(f"流通量: {report['circulating']:,}枚")
    print(f"Burn累計: {report['burned']:,}枚")
    print(f"Burn率: {report['burn_rate']}%")
    print(f"希少性スコア: {report['scarcity_score']}/100")
    print(f"市場状況: {report['market_status']}")
    
    bonus = get_gacha_bonus(report['scarcity_score'])
    if bonus > 1.0:
        print(f"🎰 ガチャボーナス: x{bonus}")

def predict_deflation():
    """デフレ予測（今後30日）"""
    report = calculate_rarity_score()
    
    # 直近のBurn速度を計算
    conn = get_connection()
    cur = conn.cursor()
    month_ago = (datetime.now() - timedelta(days=30)).isoformat()
    
    cur.execute(
        "SELECT SUM(amount) FROM transactions WHERE to_discord_id = 'BURN' AND timestamp > ?",
        (month_ago,)
    )
    monthly_burn = cur.fetchone()[0] or 0
    conn.close()
    
    daily_burn_rate = monthly_burn / 30
    projected_supply = max(0, report['total_supply'] - (daily_burn_rate * 30))
    
    print(f"\n=== 30日先予測 ===")
    print(f"現在の日平均Burn: {daily_burn_rate:.1f}枚/日")
    print(f"30日後の予想総発行量: {projected_supply:,.0f}枚")
    
    if daily_burn_rate > 0:
        days_to_half = report['total_supply'] / daily_burn_rate
        print(f"半減期まで: 約{days_to_half:.0f}日")

if __name__ == "__main__":
    import sys
    show_market_report()
    
    if len(sys.argv) > 1 and sys.argv[1] == "predict":
        predict_deflation()
