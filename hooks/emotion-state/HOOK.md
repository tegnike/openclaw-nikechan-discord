---
name: emotion-state
description: "Supabaseからニケちゃんの現在の感情状態を取得し、コンテキストに注入"
metadata:
  openclaw:
    emoji: "💜"
    events: ["agent:bootstrap"]
---

# emotion-state hook

セッション開始時にSupabaseの `character_state` テーブルからPAD感情値を取得し、遅延評価型減衰を適用した上でコンテキストに注入する。

## 処理フロー

1. `character_state` テーブルから現在のPAD値を取得
2. `updated_at` からの経過時間で短期値を指数減衰（λ=0.1、半減期約7時間）
3. 減衰が発生した場合はDBを更新し、`emotion_log` にdecayレコードを記録
4. PAD値を16種の感情ラベルに変換（ユークリッド距離で最近傍）
5. `emotion_log` から直近のきっかけ（cause/processing）を取得
6. 結果を `EMOTION.md` として `bootstrapFiles` に注入

## 環境変数

- `SUPABASE_URL` — Supabase REST APIのベースURL
- `SUPABASE_SERVICE_ROLE_KEY` — 認証キー
