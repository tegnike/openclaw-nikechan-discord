# PNG Tuber - マイク連動アバター

マイク入力で表情が変わるPNG Tuber。VOICEVOX連携可。

## 機能
- リアルタイム表情変化（マイク音量連動）
- VOICEVOX音声合成連携
- 手動表情切り替え（通常/笑顔/驚き/眠い）

## 使い方

```bash
cd skills/pngtuber
python3 -m http.server 8080
# → http://localhost:8080
```

## 音量レベルと表情

| 音量 | 表情 |
|------|------|
| 0-10% | 😊 通常 |
| 10-30% | 😄 笑顔 |
| 30-60% | 😲 驚き |
| 60%+ | 😴 眠い |

## VOICEVOX連携
1. VOICEVOXエンジン起動（localhost:50021）
2. テキスト入力 → 「話す」ボタン

## 必要環境
- ブラウザ + マイク
- VOICEVOX（オプション）: https://voicevox.hiroshiba.jp/
