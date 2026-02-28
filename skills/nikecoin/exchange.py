#!/usr/bin/env python3
"""
ニケコイン交換所（実体経済接続）
クリエイター作品・特典との交換
"""

from nikecoin import burn_coin
from datetime import datetime

# 交換可能アイテムリスト
EXCHANGE_ITEMS = {
    # クリエイター作品
    "icon_commission": {
        "name": "アイコン依頼権",
        "provider": "nyapan",
        "cost": 500,
        "stock": 3,
        "description": "AIイラストアイコン制作"
    },
    "song_request": {
        "name": "曲制作依頼権", 
        "provider": "kagetica",
        "cost": 800,
        "stock": 2,
        "description": "オリジナル曲制作"
    },
    "rap_battle": {
        "name": "ラップバトル挑戦権",
        "provider": "桂こぐま",
        "cost": 300,
        "stock": 5,
        "description": "DJ KOGUMAとの対決"
    },
    
    # デジタル特典
    "vip_role": {
        "name": "VIPロール（30日）",
        "provider": "server",
        "cost": 200,
        "stock": -1,  # 無限
        "description": "特殊チャンネルアクセス"
    },
    "custom_emoji": {
        "name": "カスタム絵文字追加権",
        "provider": "server",
        "cost": 150,
        "stock": 10,
        "description": "自分専用絵文字"
    },
    
    # 抽選応募
    "lottery_premium": {
        "name": "プレミアム抽選券",
        "provider": "lottery",
        "cost": 50,
        "stock": 100,
        "description": "高額賞品への応募権"
    },
}

def list_items():
    """交換可能アイテム一覧"""
    print("=== ニケコイン交換所 ===\n")
    
    categories = {
        "クリエイター作品": ["icon_commission", "song_request", "rap_battle"],
        "デジタル特典": ["vip_role", "custom_emoji"],
        "抽選": ["lottery_premium"]
    }
    
    for cat, items in categories.items():
        print(f"【{cat}】")
        for key in items:
            item = EXCHANGE_ITEMS[key]
            stock_str = "在庫無限" if item["stock"] == -1 else f"残り{item['stock']}個"
            print(f"  [{key}] {item['name']}")
            print(f"      価格: {item['cost']}枚 | {stock_str}")
            print(f"      {item['description']} (by {item['provider']})")
        print()

def exchange(discord_id: str, item_key: str) -> dict:
    """アイテムを交換"""
    if item_key not in EXCHANGE_ITEMS:
        return {"error": "存在しないアイテムです"}
    
    item = EXCHANGE_ITEMS[item_key]
    
    # 在庫チェック
    if item["stock"] == 0:
        return {"error": "在庫切れです"}
    
    # Burnして交換
    if burn_coin(discord_id, item["cost"], f"交換: {item['name']}"):
        # 在庫減少（有限の場合）
        if item["stock"] > 0:
            EXCHANGE_ITEMS[item_key]["stock"] -= 1
        
        return {
            "success": True,
            "item": item["name"],
            "provider": item["provider"],
            "message": f"🎁 {item['name']}を交換しました！",
            "next_step": f"{item['provider']}まで連絡してください"
        }
    else:
        return {"error": "交換に失敗しました"}

def request_custom_offer(discord_id: str, offer_type: str, price: int):
    """カスタムオファー申請"""
    offers = {
        "commission": "制作依頼",
        "collaboration": "コラボ提案",
        "sponsorship": "スポンサー募集"
    }
    
    return f"""
【カスタムオファー申請】
申請者: {discord_id}
種別: {offers.get(offer_type, 'その他')}
希望価格: {price}ニケコイン

ステータス: 審査待ち
承認された場合、{price}枚が escrow（仮払い）されます。
"""

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) >= 2:
        cmd = sys.argv[1]
        if cmd == "list":
            list_items()
        elif cmd == "buy" and len(sys.argv) >= 4:
            result = exchange(sys.argv[2], sys.argv[3])
            print(result.get("message") or result.get("error"))
            if "next_step" in result:
                print(f"→ {result['next_step']}")
    else:
        list_items()
