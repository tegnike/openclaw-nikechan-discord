# pokemon-game - 特定作品のポケモンランダム表示

## 概要
PokeAPIを使用して、特定のゲーム作品に登場するポケモンからランダムで選出する。

## APIエンドポイント

### バージョン一覧取得
```bash
curl -s https://pokeapi.co/api/v2/version?limit=50
```

### 特定バージョンのポケモン一覧
```bash
# 例：赤版（red）
curl -s https://pokeapi.co/api/v2/version/red | jq '.pokemon_species[]'

# 例：金版（gold）
curl -s https://pokeapi.co/api/v2/version/gold | jq '.pokemon_species[]'
```

### バージョングループ（世代単位）
```bash
# 第1世代（red-blue）
curl -s https://pokeapi.co/api/v2/version-group/red-blue

# 第2世代（gold-silver）
curl -s https://pokeapi.co/api/v2/version-group/gold-silver
```

## 主要なバージョン名

| 作品 | version ID |
|------|-----------|
| ポケットモンスター 赤 | red |
| ポケットモンスター 緑 | green |
| ポケットモンスター 青 | blue |
| ポケットモンスター ピカチュウ | yellow |
| ポケットモンスター 金 | gold |
| ポケットモンスター 銀 | silver |
| ポケットモンスター クリスタル | crystal |
| ポケットモンスター ルビー | ruby |
| ポケットモンスター サファイア | sapphire |
| ポケットモンスター ダイヤモンド | diamond |
| ポケットモンスター パール | pearl |
| ポケットモンスター ブラック | black |
| ポケットモンスター ホワイト | white |
| ポケットモンスター X | x |
| ポケットモンスター Y | y |
| ポケットモンスター オメガルビー | omega-ruby |
| ポケットモンスター アルファサファイア | alpha-sapphire |
| ポケットモンスター ソード | sword |
| ポケットモンスター シールド | shield |
| ポケットモンスター レジェンズ アルセウス | legends-arceus |
| ポケットモンスター スカーレット | scarlet |
| ポケットモンスター バイオレット | violet |

## 使い方

### ランダムポケモン取得（シェルスクリプト例）
```bash
#!/bin/bash
VERSION="$1"  # 例: red, gold, sword

# バージョンのポケモン一覧を取得
POKEMON_LIST=$(curl -s "https://pokeapi.co/api/v2/version/${VERSION}" | jq -r '.pokemon_species[].name')

# ランダムに1体選ぶ
RANDOM_POKEMON=$(echo "$POKEMON_LIST" | shuf -n 1)

echo "【${VERSION}版に登場するポケモン】"
echo "選ばれたポケモン: ${RANDOM_POKEMON}"

# 詳細情報取得
curl -s "https://pokeapi.co/api/v2/pokemon/${RANDOM_POKEMON}" | jq '{
  name: .name,
  id: .id,
  types: [.types[].type.name],
  sprite: .sprites.front_default
}'
```

### 実行例
```bash
./random-pokemon.sh sword
```

## 注意事項
- PokeAPIは無料で利用可能（Rate Limit: 100 requests/IP/second）
- 日本語名を取得する場合は別途speciesエンドポイントが必要
- 一部フォーム違いは別ポケモンとして扱われる

## 依存関係
- curl
- jq (JSONパーサー)
- shuf (coreutils)

## 作成日
2026-02-27
