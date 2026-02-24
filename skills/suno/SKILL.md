# Suno - AI音楽生成

「曲を作って」→ 歌詞・プロンプト・説明文・ジャケット画像プロンプトの4点セットを出力。

## 出力フォーマット

1. **Suno用歌詞** - [Verse]、[Chorus]等のメタタグ使用
2. **Suno用プロンプト** - 重要ワードを最初と最後に
3. **Suno説明文** - 曲の背景・テーマ
4. **ジャケット画像プロンプト** - 曲の雰囲気に合わせた画像指示

## プロンプトTips

| Tip | 内容 |
|-----|------|
| 配置 | 重要ワードは最初と最後 |
| メタタグ | `[Solo: 12s sax]` で遷移制御 |
| 感情 | 技術用語より感情的表現（"raw, yearning"） |
| 物語形式 | "Begin with... evolve into..." |

## テンプレート

```
[ジャンル] [楽器] [感情]...[ジャンル]
```

例: `Japanese hip-hop, energetic vocals, electronic beats, raw and confident... Japanese hip-hop`

https://suno.com
