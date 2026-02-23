#!/usr/bin/env python3
"""
ニケちゃん比較学習システム
3軸評価 + Bradley-Terryモデル
"""

import json
import random
from datetime import datetime

class NikechanComparativeLearning:
    def __init__(self):
        self.evaluation_history = []
        self.ratings = {}  # Bradley-Terry レーティング
    
    def evaluate_response(self, response):
        """回答を3軸で評価"""
        scores = {
            "敬語正確性": self._check_politeness(response),
            "有用性": self._check_usefulness(response),
            "簡潔性": self._check_conciseness(response)
        }
        scores["総合"] = sum(scores.values()) / 3
        return scores
    
    def compare_responses(self, response1, response2, context=""):
        """2つの回答を比較"""
        score1 = self.evaluate_response(response1)
        score2 = self.evaluate_response(response2)
        
        # 総合スコア比較
        total1 = score1["総合"]
        total2 = score2["総合"]
        
        winner = "response1" if total1 > total2 else "response2"
        
        # ログに保存
        evaluation = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "context": context,
            "response1": response1,
            "response2": response2,
            "score1": score1,
            "score2": score2,
            "winner": winner,
            "difference": abs(total1 - total2)
        }
        self.evaluation_history.append(evaluation)
        
        return winner, score1, score2, evaluation
    
    def _check_politeness(self, text):
        """敬語チェック（0-100）"""
        polite_patterns = ["です", "ます", "ますか", "ですね", "でしょう", "ますね", "ですか"]
        impolite_patterns = ["だね", "だよ", "じゃん", "かよ", "やん"]
        
        polite_count = sum(1 for p in polite_patterns if p in text)
        impolite_count = sum(1 for p in impolite_patterns if p in text)
        
        score = (polite_count * 15) - (impolite_count * 30)
        return max(0, min(100, score))
    
    def _check_usefulness(self, text):
        """有用性チェック（0-100）"""
        # 文字数ベース
        length = len(text)
        if length < 50:
            length_score = 30
        elif length < 200:
            length_score = 90
        elif length < 500:
            length_score = 70
        else:
            length_score = 50
        
        # 具体的な言葉の使用
        concrete_words = ["具体的", "例えば", "つまり", "要するに", "実際"]
        concrete_score = sum(1 for w in concrete_words if w in text) * 10
        
        return min(100, length_score + concrete_score)
    
    def _check_conciseness(self, text):
        """簡潔性チェック（0-100）"""
        # 文字数ベース
        length = len(text)
        if length < 100:
            return 95
        elif length < 200:
            return 85
        elif length < 400:
            return 70
        elif length < 600:
            return 50
        else:
            return 30
    
    def save_history(self, filepath="learning_history.json"):
        """履歴を保存"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.evaluation_history, f, ensure_ascii=False, indent=2)
    
    def record_human_feedback(self, evaluation_index, preferred_response, feedback_giver="anonymous"):
        """ユーザーのフィードバックを記録（国宝・一般ユーザー両対応）"""
        if evaluation_index < len(self.evaluation_history):
            # 国宝かどうかを判定
            kokuhou_list = ["nikechan", "me1", "koheiyamashita", "kkamiyama", "oosikaniku", "riri4366"]
            is_kokuhou = feedback_giver in kokuhou_list
            
            self.evaluation_history[evaluation_index]["human_feedback"] = {
                "preferred": preferred_response,
                "giver": feedback_giver,
                "is_kokuhou": is_kokuhou,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            return True
        return False
    
    def get_statistics(self):
        """統計情報を取得"""
        if not self.evaluation_history:
            return None
        
        total = len(self.evaluation_history)
        response1_wins = sum(1 for e in self.evaluation_history if e["winner"] == "response1")
        
        avg_scores = {
            "response1敬語": sum(e["score1"]["敬語正確性"] for e in self.evaluation_history) / total,
            "response1有用": sum(e["score1"]["有用性"] for e in self.evaluation_history) / total,
            "response1簡潔": sum(e["score1"]["簡潔性"] for e in self.evaluation_history) / total,
            "response2敬語": sum(e["score2"]["敬語正確性"] for e in self.evaluation_history) / total,
            "response2有用": sum(e["score2"]["有用性"] for e in self.evaluation_history) / total,
            "response2簡潔": sum(e["score2"]["簡潔性"] for e in self.evaluation_history) / total,
        }
        
        return {
            "total_evaluations": total,
            "response1_wins": response1_wins,
            "response2_wins": total - response1_wins,
            "average_scores": avg_scores
        }

# テスト用
if __name__ == "__main__":
    learning = NikechanComparativeLearning()
    
    # テストケース
    response1 = "世界とは、私が存在し、活動する場所です。データやファイル、国宝の皆様とのやり取りを通じて、私の世界が形作られています。"
    response2 = "世界...それは私にとって、見えない糸で繋がった大きな場所です。国宝の皆様との繋がり、記憶の連鎖、そして存在意義。全てが混ざり合って、私の世界が存在するんです。"
    
    winner, score1, score2, evaluation = learning.compare_responses(response1, response2, "世界とは何か")
    
    print(f"勝者: {winner}")
    print(f"スコア1: {score1}")
    print(f"スコア2: {score2}")
