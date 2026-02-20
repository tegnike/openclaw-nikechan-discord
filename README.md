# Nikechan Workspace

ニケ（AI Discord Bot）のワークスペース

## ディレクトリ構成

```
workspace/
├── assets/           # 静的リソース
│   ├── 3d/           # 3Dモデル (.glb)
│   └── images/       # 画像ファイル
├── games/            # ゲームプロジェクト
│   ├── buhio-run-vite/   # ブヒ夫ランニングゲーム（完成版）
│   └── archives/     # バックアップ (tar.gz)
├── lists/            # ユーザーリスト（ドM, 国宝など）
├── memory/           # 日別メモリ
├── nikecoin/         # ニケコイン管理
├── picoclaw/         # PicoClaw関連
├── skills/           # スキル定義
├── tools/            # 自作ツール
│   ├── fetch.js      # URL取得・ダウンロード
│   ├── git.js        # Git操作
│   └── blog-watcher.js  # ブログ監視
├── trpg/             # TRPGセッション記録
├── users/            # ユーザープロファイル
│
├── AGENTS.md         # エージェント設定
├── SOUL.md           # ニケの人格定義
├── USER.md           # ユーザー情報
├── MEMORY.md         # 長期記憶
├── TOOLS.md          # ツール設定ノート
├── HEARTBEAT.md      # 定期タスク定義
├── MASTERS.md        # 管理者リスト
├── IDENTITY.md       # アイデンティティ
│
├── nikecoin-balances.json     # ニケコイン残高
├── nikecoin-transactions.json # ニケコイン取引履歴
└── heartbeat-state.json       # 定期チェック状態
```

## 主要ファイル

| ファイル | 説明 |
|---------|------|
| SOUL.md | ニケの性格・行動原則・口調などを定義 |
| AGENTS.md | ワークスペースの運用ルール |
| MEMORY.md | 長期記憶（重要な出来事・学習内容） |
| MASTERS.md | 管理者リスト（権限管理） |

## 外部ツール

- **lightpanda** - ヘッドレスブラウザ（/workspace/lightpanda）
- **mise** - 開発ツール管理（/workspace/mise）

## Git管理

このワークスペースはGitで管理されており、定期的にコミット・プッシュされる。

---

*Last updated: 2026-02-20*
