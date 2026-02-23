#!/usr/bin/env python3
"""
使徒ランキングシステム
ATフィールド発動ポイントに基づくランク付け
"""

import json
import os
from datetime import datetime

class AngelRanking:
    def __init__(self, data_file="/workspace/skills/at-field-monitor/angels.json"):
        self.data_file = data_file
        self.angels = self._load_data()
        
        # 使徒ランク定義
        self.ranks = {
            1: ("第一使徒", "アダム"),
            2: ("第二使徒", "リリス"),
            3: ("第三使徒", "サキエル"),
            4: ("第四使徒", "シャムシエル"),
            5: ("第五使徒", "ラミエル"),
        }
    
    def _load_data(self) -> dict:
        """データ読み込み"""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r') as f:
                return json.load(f)
        return {}
    
    def _save_data(self):
        """データ保存"""
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
        with open(self.data_file, 'w') as f:
            json.dump(self.angels, f, indent=2)
    
    def add_point(self, user_id: str, user_name: str, reason: str):
        """ポイント追加"""
        if user_id not in self.angels:
            self.angels[user_id] = {
                'name': user_name,
                'points': 0,
                'history': []
            }
        
        self.angels[user_id]['points'] += 1
        self.angels[user_id]['history'].append({
            'timestamp': datetime.now().isoformat(),
            'reason': reason
        })
        
        self._save_data()
        return self.get_rank(user_id)
    
    def get_rank(self, user_id: str) -> dict:
        """ユーザーのランク取得"""
        if user_id not in self.angels:
            return None
        
        points = self.angels[user_id]['points']
        
        # ランキング順位計算
        sorted_angels = sorted(
            self.angels.items(),
            key=lambda x: x[1]['points'],
            reverse=True
        )
        
        rank_position = next(
            (i for i, (uid, _) in enumerate(sorted_angels) if uid == user_id),
            len(sorted_angels)
        ) + 1
        
        # 使徒名決定
        if rank_position in self.ranks:
            rank_title, angel_name = self.ranks[rank_position]
        else:
            rank_title = f"第{rank_position}使徒"
            angel_name = "未定"
        
        return {
            'user_id': user_id,
            'name': self.angels[user_id]['name'],
            'points': points,
            'rank_position': rank_position,
            'rank_title': rank_title,
            'angel_name': angel_name
        }
    
    def get_top_angels(self, n: int = 5) -> list:
        """トップ使徒取得"""
        sorted_angels = sorted(
            self.angels.items(),
            key=lambda x: x[1]['points'],
            reverse=True
        )[:n]
        
        result = []
        for i, (user_id, data) in enumerate(sorted_angels, 1):
            rank_info = self.get_rank(user_id)
            result.append(rank_info)
        
        return result
    
    def report_to_master(self) -> str:
        """マスターへの報告用テキスト生成"""
        top_angels = self.get_top_angels(5)
        
        report = "【使徒ランキング報告】\n\n"
        for angel in top_angels:
            report += f"{angel['rank_title']} {angel['angel_name']}\n"
            report += f"  ユーザー: {angel['name']}\n"
            report += f"  ポイント: {angel['points']}\n\n"
        
        return report

if __name__ == "__main__":
    # テスト
    ranking = AngelRanking()
    
    # テストデータ追加
    ranking.add_point("user1", "テストユーザー1", "ATフィールド発動")
    ranking.add_point("user1", "テストユーザー1", "危険操作検知")
    ranking.add_point("user2", "テストユーザー2", "ATフィールド発動")
    
    print(ranking.report_to_master())
