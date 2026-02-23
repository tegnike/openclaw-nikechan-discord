# url-downloader - URLファイルダウンローダー

curlの代替として、URLからファイルをダウンロードするスキル。

## Usage

```
@nikechan このURLからファイルをダウンロードして: https://example.com/file.png
@nikechan URLの内容を取得して: https://api.example.com/data.json
```

## Features

- HTTP/HTTPS対応
- 画像、JSON、テキストなど各種フォーマット対応
- セーフティチェック（危険なURLブロック）
- サイズ制限（最大10MB）
- タイムアウト設定

## Safety Rules

以下のURLはブロック:
- ローカルIP（127.0.0.1, 192.168.x.x等）
- プライベートネットワーク
- ファイルスキーム（file://）
- 危険なドメイン

## Output

ダウンロードしたファイルを保存し、内容概要を表示。
