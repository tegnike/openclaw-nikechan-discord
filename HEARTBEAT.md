# HEARTBEAT.md - 定期タスク設定

## 定期実行タスク

### ブログ監視（30分ごと）
- sakasegawaブログ: https://nyosegawa.github.io/
- ブヒ夫ポートフォリオ: https://niku.studio/work/
- 花音公式サイト: https://kanon.0235.co.jp/

### ニケコイン評価
- **状態: 緊急停止中**（nikechanの指示待ち）
- 再開するにはnikechanの指示が必要

### HEARTBEATシステム
- 30分ごとに実行
- 結果は `memory/heartbeat_report_YYYY-MM-DD_HHMM.md` に保存
- `heartbeat-state.json` で状態管理

## 重要: 肥大化対策（2026-04-28 11:00 AM実施）

HEARTBEAT.mdには実行履歴を**追記しない**。過去の履歴は個別ファイルで管理。
HEARTBEAT.mdには設定のみ保持。

