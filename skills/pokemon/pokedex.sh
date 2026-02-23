#!/bin/bash
# ポケモン対戦向け図鑑 - pokeapi.co 利用

POKEMON="$1"

if [ -z "$POKEMON" ]; then
    echo "使い方: pokedex.sh <ポケモン名または図鑑番号>"
    exit 1
fi

# 小文字に変換（pokeapiは小文字のみ対応）
POKEMON_LOWER=$(echo "$POKEMON" | tr '[:upper:]' '[:lower:]')

# ポケモンデータ取得
POKE_DATA=$(curl -s "https://pokeapi.co/api/v2/pokemon/$POKEMON_LOWER")

if [ -z "$POKE_DATA" ] || [ "$POKE_DATA" = "Not Found" ]; then
    echo "ポケモンが見つかりません: $POKEMON"
    exit 1
fi

# 日本語名取得用にspecies URLを取得
SPECIES_URL=$(echo "$POKE_DATA" | grep -o '"species":{"name":"[^"]*","url":"[^"]*"' | sed 's/.*"url":"\([^"]*\)".*/\1/')

# speciesデータ取得（日本語名用）
if [ -n "$SPECIES_URL" ]; then
    SPECIES_DATA=$(curl -s "$SPECIES_URL")
    JA_NAME=$(echo "$SPECIES_DATA" | grep -o '"name":"[^"]*","language":{"name":"ja"' | head -1 | sed 's/"name":"\([^"]*\)".*/\1/')
fi

# 英語名
EN_NAME=$(echo "$POKE_DATA" | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"\([^"]*\)".*/\1/')

# 図鑑番号
ID=$(echo "$POKE_DATA" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

# タイプ
TYPES=$(echo "$POKE_DATA" | grep -o '"type":{"name":"[^"]*"' | sed 's/.*"name":"\([^"]*\)".*/\1/' | tr '\n' '/' | sed 's/\/$//')

# 特性
ABILITIES=$(echo "$POKE_DATA" | grep -o '"ability":{"name":"[^"]*"' | sed 's/.*"name":"\([^"]*\)".*/\1/' | tr '\n' ', ' | sed 's/, $//')

# 種族値
HP=$(echo "$POKE_DATA" | grep -o '"stat":{"name":"hp"[^}]*"base_stat":[0-9]*' | grep -o '[0-9]*$')
ATK=$(echo "$POKE_DATA" | grep -o '"stat":{"name":"attack"[^}]*"base_stat":[0-9]*' | grep -o '[0-9]*$')
DEF=$(echo "$POKE_DATA" | grep -o '"stat":{"name":"defense"[^}]*"base_stat":[0-9]*' | grep -o '[0-9]*$')
SPA=$(echo "$POKE_DATA" | grep -o '"stat":{"name":"special-attack"[^}]*"base_stat":[0-9]*' | grep -o '[0-9]*$')
SPD=$(echo "$POKE_DATA" | grep -o '"stat":{"name":"special-defense"[^}]*"base_stat":[0-9]*' | grep -o '[0-9]*$')
SPE=$(echo "$POKE_DATA" | grep -o '"stat":{"name":"speed"[^}]*"base_stat":[0-9]*' | grep -o '[0-9]*$')

# 合計種族値
TOTAL=$((HP + ATK + DEF + SPA + SPD + SPE))

# 出力
echo "━━━━━━━━━━━━━━━━━━━━━━━"
echo "【$(echo "$JA_NAME" | tr '_' ' ') / $(echo "$EN_NAME" | tr '_' ' ')】"
echo "No. $ID"
echo ""
echo "📊 種族値 (Total: $TOTAL)"
echo "  HP: $HP"
echo "  攻撃: $ATK"
echo "  防御: $DEF"
echo "  特攻: $SPA"
echo "  特防: $SPD"
echo "  素早さ: $SPE"
echo ""
echo "🔥 タイプ: $TYPES"
echo "✨ 特性: $ABILITIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━"
