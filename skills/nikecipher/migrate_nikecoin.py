#!/usr/bin/env python3
"""
ニケコイン移行スクリプト
旧DB（SQLite）→ 新ブロックチェーン（暗号化）
"""

import sys
import os
import sqlite3
from datetime import datetime

# 新しいニケコインシステムをインポート
sys.path.insert(0, '/workspace/skills/nikecipher')
from nikecoin import NikeCoinBlockchain

def migrate_database(old_db_path):
    """旧DBから新ブロックチェーンに移行"""
    
    print("🔄 ニケコイン移行開始")
    print("=" * 60)
    
    # 旧DBに接続
    conn = sqlite3.connect(old_db_path)
    cursor = conn.cursor()
    
    # 全ユーザーと残高を取得
    cursor.execute('''
        SELECT u.discord_id, u.username, COALESCE(b.balance, 0) as balance
        FROM users u
        LEFT JOIN balances b ON u.discord_id = b.discord_id
        ORDER BY balance DESC
    ''')
    users = cursor.fetchall()
    
    # 全取引履歴を取得
    cursor.execute('''
        SELECT id, from_discord_id, to_discord_id, amount, reason, timestamp
        FROM transactions
        ORDER BY id
    ''')
    transactions = cursor.fetchall()
    
    conn.close()
    
    print(f"📊 移行データ:")
    print(f"  ユーザー数: {len(users)}")
    print(f"  取引履歴: {len(transactions)}")
    print()
    
    # 新しいブロックチェーンを初期化
    print("🔗 新しいブロックチェーンを初期化...")
    blockchain = NikeCoinBlockchain()
    
    # 既存のブロックチェーンをクリア
    blockchain.chain = []
    
    # ジェネシスブロックを作成
    print("✅ ジェネシスブロック作成")
    genesis = blockchain.create_genesis_block()
    
    # 移行情報を記録
    migration_tx = {
        "from": "nikecoin_mint",
        "to": "migration_log",
        "amount": 0,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "type": "migration_start",
        "old_db": old_db_path,
        "total_users": len(users),
        "total_transactions": len(transactions)
    }
    
    # ユーザー残高を一括発行（マイグレーション用）
    print("\n💰 ユーザー残高を発行中...")
    mint_transactions = []
    
    for discord_id, username, balance in users:
        if balance > 0:
            tx = {
                "from": "nikecoin_mint",
                "to": discord_id,
                "amount": balance,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "type": "migration_mint",
                "username": username
            }
            mint_transactions.append(tx)
            print(f"  ✅ {username} ({discord_id}): {balance} NC")
    
    # マイグレーションブロックを追加
    print("\n📝 マイグレーションブロックを追加...")
    migration_block = blockchain.add_block([migration_tx] + mint_transactions)
    print(f"  ✅ Block #{migration_block['index']}")
    
    # 過去の取引履歴は別ファイルにアーカイブ（ブロックチェーンには記録しない）
    print("\n📜 取引履歴をアーカイブ中...")
    archive_data = {
        "migration_date": datetime.utcnow().isoformat() + "Z",
        "total_transactions": len(transactions),
        "transactions": []
    }
    
    for tx_id, from_discord_id, to_discord_id, amount, reason, timestamp in transactions:
        tx = {
            "id": tx_id,
            "from": from_discord_id,
            "to": to_discord_id,
            "amount": amount,
            "reason": reason,
            "timestamp": timestamp
        }
        archive_data["transactions"].append(tx)
    
    # アーカイブファイルに保存
    archive_path = "blockchain/nikecoin_archive.json"
    import json as json_module
    with open(archive_path, 'w', encoding='utf-8') as f:
        json_module.dump(archive_data, f, indent=2, ensure_ascii=False)
    print(f"  ✅ {len(transactions)} 件の取引を {archive_path} に保存")
    
    # 検証
    print("\n🔍 ブロックチェーン検証...")
    is_valid, message = blockchain.verify_chain()
    
    if is_valid:
        print(f"✅ {message}")
        print(f"📊 総ブロック数: {len(blockchain.chain)}")
        
        # 残高確認
        print("\n💰 移行後の残高:")
        for discord_id, username, balance in users:
            new_balance = blockchain.get_balance(discord_id)
            print(f"  {username}: {new_balance} NC")
            
            if new_balance != balance:
                print(f"    ⚠️  残高不一致！（元: {balance} NC）")
        
        print("\n🎉 移行完了！")
        print(f"📦 ブロックチェーン: blockchain/nikecoin.enc")
        print(f"📦 取引アーカイブ: blockchain/nikecoin_archive.json")
        
    else:
        print(f"❌ {message}")
        sys.exit(1)

if __name__ == "__main__":
    old_db_path = "/workspace/skills/nikecoin/nikecoin.db"
    
    if not os.path.exists(old_db_path):
        print(f"エラー: 旧DBが見つかりません: {old_db_path}")
        sys.exit(1)
    
    migrate_database(old_db_path)
