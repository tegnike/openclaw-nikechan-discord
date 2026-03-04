#!/usr/bin/env python3
"""
ニケコイン - シンプル版メインエントリーポイント
"""

import sys
import argparse
from coin import NikeCoin


def main():
    parser = argparse.ArgumentParser(description="ニケコイン管理システム")
    subparsers = parser.add_subparsers(dest="command", help="コマンド")

    # balance - 残高確認
    balance_parser = subparsers.add_parser("balance", help="残高を確認")
    balance_parser.add_argument("user_id", help="DiscordユーザーID")

    # mint - 発行（管理者用）
    mint_parser = subparsers.add_parser("mint", help="コインを発行")
    mint_parser.add_argument("user_id", help="対象ユーザーID")
    mint_parser.add_argument("amount", type=int, help="発行量")
    mint_parser.add_argument("--reason", "-r", default="管理者発行", help="発行理由")

    # transfer - 送金
    transfer_parser = subparsers.add_parser("transfer", help="コインを送金")
    transfer_parser.add_argument("from_user", help="送信元ユーザーID")
    transfer_parser.add_argument("to_user", help="送信先ユーザーID")
    transfer_parser.add_argument("amount", type=int, help="送金額")
    transfer_parser.add_argument("--reason", "-r", default="送金", help="送金理由")

    # history - 履歴
    history_parser = subparsers.add_parser("history", help="取引履歴")
    history_parser.add_argument("user_id", help="ユーザーID")
    history_parser.add_argument("--limit", "-l", type=int, default=10, help="表示件数")

    # list - 全ユーザー一覧
    list_parser = subparsers.add_parser("list", help="全ユーザーの残高一覧")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    coin = NikeCoin()

    try:
        if args.command == "balance":
            result = coin.balance(args.user_id)
            print(f"💰 残高: {result} ニケコイン")

        elif args.command == "mint":
            coin.mint(args.user_id, args.amount, args.reason)
            new_balance = coin.balance(args.user_id)
            print(f"✅ {args.amount} ニケコインを発行しました")
            print(f"💰 新しい残高: {new_balance}")

        elif args.command == "transfer":
            coin.send(args.from_user, args.to_user, args.amount, args.reason)
            from_balance = coin.balance(args.from_user)
            to_balance = coin.balance(args.to_user)
            print(f"💸 {args.amount} ニケコインを送金しました")
            print(f"📤 送信元残高: {from_balance}")
            print(f"📥 送信先残高: {to_balance}")

        elif args.command == "history":
            history = coin.history(args.user_id, args.limit)
            if not history:
                print("📭 取引履歴がありません")
            else:
                print(f"\n📜 取引履歴（最新{len(history)}件）")
                print("-" * 60)
                for tx in history:
                    direction = "→" if tx.from_user == args.user_id else "←"
                    print(f"{tx.timestamp} | {direction} {tx.amount} | {tx.description}")

        elif args.command == "list":
            users = coin.leaderboard()
            if not users:
                print("👤 ユーザーがいません")
            else:
                print("\n🏆 ニケコイン保有ランキング")
                print("-" * 50)
                for i, user in enumerate(users, 1):
                    medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "  "
                    print(f"{medal} {i}. {user.user_id}: {user.balance} コイン")

    except Exception as e:
        print(f"❌ エラー: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
