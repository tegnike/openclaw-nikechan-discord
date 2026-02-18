# 承認リスト

このファイルでは、マスターの承認が必要な操作を管理します。

## 承認が必要な操作

### パッケージ管理
- apt-get install/uninstall/upgrade
- npm install/uninstall
- pip install/uninstall

### システム設定変更
- SOUL.md の変更
- MASTERS.md の変更
- USER.md の変更
- その他設定ファイルの変更

### 権限・セキュリティ
- 新規ユーザーのマスター追加
- リスト（danger-list, servant-list等）の更新
- 外部サービスへの接続

### ファイル操作
- 重要なファイルの削除
- 外部へのデータ送信

## 承認フロー

1. ユーザーが操作を要求
2. ニケが承認リストを確認
3. マスターの承認を求める
4. マスターが承認した場合のみ実行

## 現在の保留中の操作

### apt-getの有効化
- 要求者: めいちゃん, nikechan
- 内容: Dockerコンテナをrwモードで再起動し、apt-getを使用可能にする
- 状態: マスター承認済み
- 実行方法: ホスト側で `openclaw gateway restart` またはコンテナ設定変更
