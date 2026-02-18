# LM Studio - Advanced Configuration

## MLX 対応（Apple Silicon最適化）

LM Studio は Apple Silicon の MLX フレームワークに対応しており、GPU加速を自動的に活用する。

### MLX モデルの使用

一部のモデルは MLX 形式で提供されており、Apple Silicon でより高速に動作する：
- 検索時に "MLX" タグでフィルタリング可能
- 通常の GGUF モデルも Metal Performance Shaders で高速化される

### パフォーマンス最適化

**GPU Offload 設定:**
- 最大値（100%）に設定することで、すべてのレイヤーをGPUで処理
- メモリ不足の場合は値を下げる（CPU fallback）

**Context Length:**
- 4096: デフォルト（8GB メモリ）
- 8192: 16GB メモリ以上
- 16384: 32GB メモリ以上

**Batch Size:**
- 自動設定で問題なし
- カスタム設定: 512〜2048（メモリに依存）

## カスタムモデルのインポート

### Hugging Face から直接インポート

1. Hugging Face でモデルページを開く（例: https://huggingface.co/Qwen/Qwen2.5-7B-Instruct）
2. 「Files and versions」タブを選択
3. GGUF ファイルのURLをコピー
4. LM Studio の検索バーにURLを貼り付け
5. ダウンロード

### ローカルファイルのインポート

1. GGUF ファイルをダウンロード
2. LM Studio の「My Models」フォルダに配置
   - デフォルト: `~/.lm-studio/models/`
3. アプリを再起動すると自動認識

## ローカルサーバー API 詳細

### エンドポイント一覧

**チャット completions:**
```
POST http://localhost:1234/v1/chat/completions
```

リクエスト例:
```json
{
  "model": "local-model",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "こんにちは！"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

**Completions (legacy):**
```
POST http://localhost:1234/v1/completions
```

**モデル一覧:**
```
GET http://localhost:1234/v1/models
```

レスポンス例:
```json
{
  "object": "list",
  "data": [
    {
      "id": "Qwen/Qwen2.5-7B-Instruct-GGUF",
      "object": "model",
      "owned_by": "local"
    }
  ]
}
```

### ストリーミング対応

```python
stream = client.chat.completions.create(
    model="local-model",
    messages=[{"role": "user", "content": "長い話をして"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### curl での使用例

```bash
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local-model",
    "messages": [{"role": "user", "content": "こんにちは"}]
  }'
```

## 量子化形式の詳細

### GGUF 量子化レベル比較

| 形式 | 品質 | サイズ | 速度 | 推奨用途 |
|------|------|--------|------|----------|
| Q2_K | 低 | 最小 | 最速 | テスト用 |
| Q3_K_M | 中低 | 小 | 高速 | 軽量重視 |
| Q4_K_M | 中 | 中 | 標準 | **推奨** |
| Q5_K_M | 中高 | 大 | やや遅 | 高品質 |
| Q6_K | 高 | 更に大 | 遅い | 最高品質 |
| Q8_0 | 最高 | 最大 | 遅い | 最高品質 |

### 量子化選択の目安

- **8GB メモリ:** 7B Q4_K_M または 3B Q5_K_M
- **16GB メモリ:** 7B Q5_K_M または 13B Q4_K_M
- **32GB メモリ:** 13B Q5_K_M または 70B Q4_K_M

## システムプロンプトの設定

### チャットでの設定

1. 「Chat」画面の設定アイコンをクリック
2. 「System Prompt」欄に入力
3. モデルごとに保存可能

### API での設定

```python
response = client.chat.completions.create(
    model="local-model",
    messages=[
        {"role": "system", "content": "あなたは日本語で丁寧に答えるアシスタントです。"},
        {"role": "user", "content": "こんにちは"}
    ]
)
```

## トラブルシューティング詳細

### メモリ不足エラー

**症状:** モデル読み込み時にクラッシュ

**解決策:**
1. Context Length を減らす（4096 → 2048）
2. GPU Offload を下げる（100% → 80%）
3. 小さいモデルに切り替え
4. 他のアプリを終了

### 生成が遅い

**症状:** トークン生成が非常に遅い

**原因と解決策:**
- GPU Offload が低い → 最大に設定
- モデルが大きすぎる → 小さいモデルへ
- Context Length が大きすぎる → 減らす
- 古いMac → MLX 対応モデルを使用

### サーバーが応答しない

**症状:** API リクエストがタイムアウト

**解決策:**
1. サーバーが起動しているか確認
2. ポート番号を確認（デフォルト: 1234）
3. ファイアウォール設定を確認
4. モデルが読み込まれているか確認

## 高度な設定

### カスタムパラメータ

サーバー設定で以下を調整可能:
- **Temperature:** 0.0〜2.0（創造性）
- **Top P:** 0.0〜1.0（nucleus sampling）
- **Top K:** 0〜100（トークン数制限）
- **Repeat Penalty:** 1.0〜2.0（繰り返し防止）

### 複数モデルの同時実行

LM Studio は現在、単一モデルのみサポート。複数モデルを同時実行するには:
1. 複数の LM Studio インスタンスを起動
2. 各インスタンスで異なるポートを使用
3. 各インスタンスで異なるモデルを読み込み

### モデルの管理

**モデルの削除:**
1. 「My Models」タブを開く
2. モデルの横の「...」メニューをクリック
3. 「Delete」を選択

**モデル情報の確認:**
- パラメータ数
- 量子化レベル
- コンテキスト長
- ファイルサイズ
