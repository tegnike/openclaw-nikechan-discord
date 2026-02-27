# Print Preview Skill

RGB画像をCMYK変換シミュレーションして印刷結果をプレビュー表示する。

## 機能
- ImageMagickによるICCプロファイルベース変換
- 複数印刷所プロファイル対応（Printful, SUZURI, etc）
- Web UIでドラッグ&ドロップアップロード
- 変換前後比較スライダー

## 依存
- ImageMagick
- Python 3 + Flask
- ICCプロファイル（各印刷所提供または標準JapanColor）

## 使い方
```bash
cd skills/print-preview
python app.py
# http://localhost:5000 でアクセス
```

## エンドポイント
- `POST /upload` - 画像アップロード
- `GET /preview/<id>` - 変換結果表示
- `GET /compare/<id>` - 比較ビュー
