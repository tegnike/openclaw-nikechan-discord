#!/usr/bin/env python3
"""
ニケコイン ガチャシステム
- 10コインで1回
- 称号排出
- 複数所持・装備可能
"""

import json
import random
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "nikecoin.db"
PRIZES_PATH = Path(__file__).parent / "prizes.json"
USER_TITLES_PATH = Path(__file__).parent / "user_titles.json"

# デフォルト景品データ（称号のみ）
DEFAULT_PRIZES = {
    "SS": {"rate": 0.01, "items": ["伝説のクジラ", "ニケ創世神"]},
    "S": {"rate": 0.05, "items": ["幸運の女神", "ガチャ王", "星詠み"]},
    "A": {"rate": 0.15, "items": ["ギャンブラー", "コインマスター", "大当たり屋"]},
    "B": {"rate": 0.30, "items": ["冒険者", "コレクター", "挑戦者", "夢追い人"]},
    "C": {"rate": 0.49, "items": ["初心者", "見習い", "新人", "駆け出し"]}
}

GACHA_COST = 10

def init_prizes():
    """景品データ初期化"""
    if not PRIZES_PATH.exists():
        with open(PRIZES_PATH, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_PRIZES, f, ensure_ascii=False, indent=2)

def load_prizes():
    """景品データ読み込み"""
    init_prizes()
    with open(PRIZES_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_user_titles():
    """ユーザーの称号データ読み込み"""
    if not USER_TITLES_PATH.exists():
        return {}
    with open(USER_TITLES_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_user_titles(data):
    """ユーザーの称号データ保存"""
    with open(USER_TITLES_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def draw_gacha(guaranteed_ss=False):
    """ガチャ抽選
    Args:
        guaranteed_ss: Trueの場合SS確定
    """
    prizes = load_prizes()
    
    # SS確定演出
    if guaranteed_ss:
        item = random.choice(prizes["SS"]["items"])
        return "SS", item
    
    # 通常抽選
    rand = random.random()
    cumulative = 0
    
    for rarity, data in prizes.items():
        cumulative += data["rate"]
        if rand <= cumulative:
            item = random.choice(data["items"])
            return rarity, item
    
    # フォールバック
    return "C", random.choice(prizes["C"]["items"])

def get_balance(user_id):
    """残高取得"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    cur = conn.cursor()
    cur.execute('SELECT balance FROM balances WHERE discord_id = ?', (user_id,))
    row = cur.fetchone()
    conn.close()
    return row[0] if row else 0

def update_balance(user_id, amount):
    """残高更新"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    cur = conn.cursor()
    now = datetime.now().isoformat()
    cur.execute('''
        INSERT INTO balances (discord_id, balance, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(discord_id) DO UPDATE SET
            balance = balance + ?,
            updated_at = ?
    ''', (user_id, amount, now, amount, now))
    conn.commit()
    conn.close()

def add_title(user_id, title):
    """称号追加"""
    data = load_user_titles()
    user_id = str(user_id)
    
    if user_id not in data:
        data[user_id] = {"titles": [], "equipped": []}
    
    if title not in data[user_id]["titles"]:
        data[user_id]["titles"].append(title)
    
    save_user_titles(data)

def equip_title(user_id, title):
    """称号装備"""
    data = load_user_titles()
    user_id = str(user_id)
    
    if user_id not in data or title not in data[user_id]["titles"]:
        return False
    
    if title not in data[user_id]["equipped"]:
        data[user_id]["equipped"].append(title)
    
    save_user_titles(data)
    return True

def unequip_title(user_id, title):
    """称号解除"""
    data = load_user_titles()
    user_id = str(user_id)
    
    if user_id in data and title in data[user_id].get("equipped", []):
        data[user_id]["equipped"].remove(title)
        save_user_titles(data)
        return True
    return False

def gacha_spin(user_id):
    """ガチャ実行（1回）"""
    balance = get_balance(user_id)
    
    if balance < GACHA_COST:
        return None, f"コイン不足です（所持: {balance}枚、必要: {GACHA_COST}枚）"
    
    # コイン消費
    update_balance(user_id, -GACHA_COST)
    
    # 抽選
    rarity, item = draw_gacha()
    
    # 称号追加
    add_title(user_id, item)
    
    return {"rarity": rarity, "item": item}, None

def gacha_10spin(user_id):
    """10連ガチャ実行（S以上確定演出あり）"""
    total_cost = GACHA_COST * 10
    balance = get_balance(user_id)
    
    if balance < total_cost:
        return None, f"コイン不足です（所持: {balance}枚、必要: {total_cost}枚）"
    
    # コイン消費
    update_balance(user_id, -total_cost)
    
    results = []
    # 9回通常抽選
    for i in range(9):
        rarity, item = draw_gacha()
        add_title(user_id, item)
        results.append({"rarity": rarity, "item": item})
    
    # 10回目はS以上確定（SSまたはS）
    prizes = load_prizes()
    ss_rate = prizes["SS"]["rate"]
    s_rate = prizes["S"]["rate"]
    total_s_rate = ss_rate + s_rate
    
    rand = random.random() * total_s_rate
    if rand < ss_rate:
        rarity = "SS"
        item = random.choice(prizes["SS"]["items"])
    else:
        rarity = "S"
        item = random.choice(prizes["S"]["items"])
    
    add_title(user_id, item)
    results.append({"rarity": rarity, "item": item, "guaranteed": True})
    
    return results, None

def show_titles(user_id):
    """称号一覧表示"""
    data = load_user_titles()
    user_id = str(user_id)
    
    if user_id not in data or not data[user_id]["titles"]:
        return None
    
    return {
        "all": data[user_id]["titles"],
        "equipped": data[user_id].get("equipped", [])
    }

# コマンドラインインターフェース
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使い方:")
        print("  python3 gacha.py spin <user_id>      - ガチャを回す（1回）")
        print("  python3 gacha.py spin10 <user_id>    - 10連ガチャ（S以上確定）")
        print("  python3 gacha.py titles <user_id>    - 称号一覧")
        print("  python3 gacha.py equip <user_id> <title>   - 称号装備")
        print("  python3 gacha.py unequip <user_id> <title> - 称号解除")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "spin":
        if len(sys.argv) < 3:
            print("ユーザーIDを指定してください")
            sys.exit(1)
        user_id = sys.argv[2]
        result, error = gacha_spin(user_id)
        if error:
            print(f"❌ {error}")
        else:
            rarity_emoji = {"SS": "🌈", "S": "⭐", "A": "🎯", "B": "✨", "C": "📦"}
            emoji = rarity_emoji.get(result["rarity"], "🎁")
            print(f"{emoji} 【{result['rarity']}レア】{result['item']} を獲得！")
    
    elif cmd == "spin10":
        if len(sys.argv) < 3:
            print("ユーザーIDを指定してください")
            sys.exit(1)
        user_id = sys.argv[2]
        results, error = gacha_10spin(user_id)
        if error:
            print(f"❌ {error}")
        else:
            print("🎰 10連ガチャ結果")
            print("=" * 40)
            rarity_emoji = {"SS": "🌈", "S": "⭐", "A": "🎯", "B": "✨", "C": "📦"}
            for i, r in enumerate(results, 1):
                emoji = rarity_emoji.get(r["rarity"], "🎁")
                mark = " ✨確定!" if r.get("guaranteed") else ""
                print(f"  {i:2d}. {emoji} 【{r['rarity']}】{r['item']}{mark}")
            print("=" * 40)
            # 結果サマリー
            counts = {}
            for r in results:
                counts[r["rarity"]] = counts.get(r["rarity"], 0) + 1
            summary = " | ".join([f"{k}: {v}" for k, v in sorted(counts.items())])
            print(f"📊 {summary}")
    
    elif cmd == "spin10":
        if len(sys.argv) < 3:
            print("ユーザーIDを指定してください")
            sys.exit(1)
        user_id = sys.argv[2]
        results, error = gacha_10spin(user_id)
        if error:
            print(f"❌ {error}")
        else:
            rarity_emoji = {"SS": "🌈", "S": "⭐", "A": "🎯", "B": "✨", "C": "📦"}
            print("=" * 40)
            print("🎰 10連ガチャ結果")
            print("=" * 40)
            for i, r in enumerate(results, 1):
                emoji = rarity_emoji.get(r["rarity"], "🎁")
                mark = " ✨確定" if r.get("guaranteed") else ""
                print(f"{i:2d}. {emoji} 【{r['rarity']}】{r['item']}{mark}")
            print("=" * 40)
    
    elif cmd == "titles":
        if len(sys.argv) < 3:
            print("ユーザーIDを指定してください")
            sys.exit(1)
        user_id = sys.argv[2]
        titles = show_titles(user_id)
        if not titles:
            print("称号を持っていません")
        else:
            print("=== 所持称号 ===")
            for t in titles["all"]:
                mark = "👑" if t in titles["equipped"] else "  "
                print(f"{mark} {t}")
            print(f"\n装備中: {', '.join(titles['equipped']) if titles['equipped'] else 'なし'}")
    
    elif cmd == "equip":
        if len(sys.argv) < 4:
            print("python3 gacha.py equip <user_id> <title>")
            sys.exit(1)
        user_id, title = sys.argv[2], sys.argv[3]
        if equip_title(user_id, title):
            print(f"✅ 「{title}」を装備しました")
        else:
            print(f"❌ 称号を装備できませんでした")
    
    elif cmd == "unequip":
        if len(sys.argv) < 4:
            print("python3 gacha.py unequip <user_id> <title>")
            sys.exit(1)
        user_id, title = sys.argv[2], sys.argv[3]
        if unequip_title(user_id, title):
            print(f"✅ 「{title}」の装備を解除しました")
        else:
            print(f"❌ 称号を解除できませんでした")
    
    else:
        print(f"不明なコマンド: {cmd}")
