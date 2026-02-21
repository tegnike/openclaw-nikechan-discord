---
name: suno
description: Suno v5を使った曲作成スキル。「曲を作って」「歌を作って」「Sunoで作って」などの指示があった場合に呼び出す。歌詞・プロンプト・説明文・ジャケット画像プロンプトの4点セットを出力する。
allowed-tools: Read, Write
---

# Suno曲作成スキル

「曲を作って」と言われたら、このスキルを参照して4点セットを出す。

## 出力フォーマット

1. **Suno用歌詞** - 日本語で、メタタグ使用可（[Verse]、[Chorus]等）
2. **Suno用プロンプト** - 重要な言葉を最初と最後に配置、感情的表現を重視
3. **Suno説明文** - 曲の背景やテーマを説明（日本語・英語）
4. **ジャケット画像生成用プロンプト** - 曲の雰囲気に合った画像指示

## Suno v5 基本情報

- Sunoの最新AI音楽生成モデル
- スタジオグレード音質、リアルなボーカル（ブレス・ビブラート対応）
- 最大8分生成（有料プラン）、1,200以上のジャンル対応
- ロスレスDL、ステム書き出し（最大12ステム）
- 公式APIなし（サードパーティAPIあり）

## プロンプト作成Tips

### 1. 重要な言葉を最初と最後に配置
v5は繰り返しの言葉を優先する。
```
Cinematic outlaw country, bluesy pedal steel, raw and emotional... cinematic southern soul.
```

### 2. 歌詞にメタタグを埋め込む
`[Solo: 12s sax swell]` や `[Break: distorted bass drop]` で遷移を制御。
```
[Verse 1] Soft vocals rise [Bridge: 15s soaring accordion solo].
```

### 3. 物語形式でムードを指定
```
Begin with a haunting piano, evolve into pulsing techno with industrial clanks.
```

### 4. JSON形式で精密指定
```
{"genre": "jazz-trap", "elements": ["sax solo", "808 bass"], "bpm": 90}
```

### 5. 感情的な言葉を優先
技術用語より感情表現（"raw, yearning", "expansive"）を重視。

### 6. 発音の調整
母音の延長（"loooove"）や句読点（"seen, seen!"）でリズム微調整。

### 7. Creative Boostは控えめに
ニッチなスタイルでは過度に一般化する可能性あり。

## テンプレート

### 基本構造
```
[ジャンル・ムード] [楽器・要素] [感情的表現]... [ジャンル・ムード]
```

### 日本語ヒップホップ例
```
Japanese hip-hop, energetic female vocals, electronic beats, raw and confident... Japanese hip-hop
```

### バラード例
```
Emotional ballad, piano and strings, yearning vocals, nostalgic and warm... emotional ballad
```
