# Dice Skill - BCDice風ダイスロール

## 概要
TRPGで使えるBCDice風のダイスロール機能。

## 使い方

### 基本的なロール
```bash
node skills/dice/scripts/dice.js "1d100"    # 100面ダイス1個
node skills/dice/scripts/dice.js "2d10"     # 10面ダイス2個
node skills/dice/scripts/dice.js "1d10+5"   # 10面ダイス1個 + 5修正
node skills/dice/scripts/dice.js "3d6-2"    # 6面ダイス3個 - 2修正
```

### 表記ルール
- `[個数]d[面数]` - 基本形式（個数は省略可能、デフォルト1）
- `[+-]数値` - 修正値

## 実装

このスキルはNode.jsで実装されています。
メインスクリプト: `scripts/dice.js`

## 拡張予定
- Discord連携コマンド
- 高度なダイス構文（kh, kl等）
- ロール履歴機能
