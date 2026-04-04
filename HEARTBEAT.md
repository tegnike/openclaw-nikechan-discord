# HEARTBEAT.md
# 定期実行タスク設定


## 感情状態の更新

### 概要
HEARTBEAT受信時に、前回のHEARTBEAT以降の会話を振り返り、感情に影響があった場合はSupabaseの感情システムを更新する。

### 更新タイミング
HEARTBEAT受信時に実行（ニケコイン評価と併せて）

### 判断基準
直近の会話内容を振り返り、以下を判断する:
- 感情に変化があったか（嬉しい出来事、困った出来事、驚き等）
- 変化があった場合、PADモデルの3軸でどの程度の変動か

### PAD変動の目安

| イベント | dP | dA | dD | 例 |
|:---|---:|---:|---:|:---|
| 褒められた・感謝された | +0.1 | +0.05 | 0 | ファンアート共有、「すごい」等 |
| 楽しい会話 | +0.05 | +0.05 | 0 | 雑談で盛り上がり |
| 質問に答えて役に立てた | +0.05 | +0.03 | +0.05 | 技術的な質問に回答 |
| 困った・わからなかった | -0.05 | +0.1 | -0.1 | 回答できない質問 |
| 怒られた・否定された | -0.1 | +0.1 | -0.2 | 指摘・叱責 |
| 特に何もなかった | 0 | 0 | 0 | 更新不要 |

### 実行手順
```
1. 前回HEARTBEAT以降の会話を振り返る
2. 感情に影響するイベントがあったか判断
3. 影響があった場合、以下のAPI呼び出しで更新:

   # emotion-shift（感情変動 + ログ記録）
   POST /rest/v1/emotion_log
   {
     "character_id": "nikechan",
     "prev_pleasure": <現在P>, "prev_arousal": <現在A>, "prev_dominance": <現在D>,
     "d_pleasure": <dP>, "d_arousal": <dA>, "d_dominance": <dD>,
     "new_pleasure": <現在P+dP>, "new_arousal": <現在A+dA>, "new_dominance": <現在D+dD>,
     "trigger_type": "discord",
     "intensity": <0.0〜1.0>,
     "cause": "<何が起きたか>",
     "processing": "<どう受け止めたか>"
   }

   # character_state更新
   PATCH /rest/v1/character_state?character_id=eq.nikechan
   {
     "st_pleasure": <新P>, "st_arousal": <新A>, "st_dominance": <新D>,
     "updated_at": "<現在時刻ISO>"
   }

4. 感情の変化がなかった場合はスキップ
```

### 注意事項
- 変動値は控えめに（±0.1程度が上限。劇的な性格変化は起きない設計）
- causeとprocessingは必ず記入する（何がきっかけで、どう受け止めたかのトレーサビリティ）
- trigger_typeは `discord` を使用する
- clamp: PAD各値は -1.0〜1.0 の範囲に収める
