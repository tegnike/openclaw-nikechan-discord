---
name: lm-studio
description: Run local LLMs on macOS with LM Studio. Use when users want to: (1) Run LLMs locally without API costs, (2) Use OpenAI API-compatible local server, (3) Chat with models offline, (4) Download and manage GGUF models, (5) Leverage Apple Silicon MLX acceleration. Supports chat interface, local server mode, and model management.
---

# LM Studio

ローカルでLLMを実行するためのmacOSアプリ。OpenAI API互換のローカルサーバーも提供。

## インストール

```bash
brew install --cask lm-studio
```

現在のバージョン: v0.4.2-2

## 基本的な使い方

### 1. モデルのダウンロード

1. アプリを起動
2. 左側の検索バーからモデルを検索（例: "Qwen", "Llama", "Mistral"）
3. 量子化レベルを選択（Q4_K_M がバランス良好）
4. ダウンロードボタンをクリック

推奨モデル（Apple Silicon向け）:
- Qwen2.5-7B-Instruct（高速、高品質）
- Llama-3.2-3B-Instruct（軽量）
- Mistral-7B-Instruct-v0.3（バランス型）

### 2. チャット機能

1. 左側メニューから「Chat」を選択
2. 上部でモデルを選択
3. チャット入力欄にメッセージを入力
4. GPU オフロード設定を調整（デフォルトでOK）

### 3. ローカルサーバー（OpenAI API互換）

1. 左側メニューから「Local Server」を選択
2. モデルを選択
3. 「Start Server」をクリック
4. デフォルト: `http://localhost:1234`

APIエンドポイント:
```
POST http://localhost:1234/v1/chat/completions
POST http://localhost:1234/v1/completions
GET  http://localhost:1234/v1/models
```

Python での使用例:
```python
import openai

client = openai.OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="local-model",
    messages=[
        {"role": "user", "content": "こんにちは！"}
    ]
)
print(response.choices[0].message.content)
```

### 4. 設定の最適化

Apple Silicon (M1/M2/M3) 向け:
- GPU Offload: 最大値に設定
- Context Length: 4096〜8192（メモリに依存）
- Thread: 自動

量子化レベルの目安:
- Q4_K_M: バランス型（推奨）
- Q5_K_M: 高品質（メモリ多め）
- Q8_0: 最高品質（重い）
- Q2_K: 軽量（品質低下）

## トラブルシューティング

### モデルが遅い
- GPU Offload を確認（最大に設定）
- 小さいモデルに切り替え
- 量子化レベルを下げる

### メモリ不足
- Context Length を減らす
- 小さいモデルを使用
- 他のアプリを終了

### サーバーが起動しない
- ポート1234が使用されていないか確認
- モデルが正しく読み込まれているか確認

## 参考資料

詳細な設定や高度な使い方は [references/advanced.md](references/advanced.md) を参照。
