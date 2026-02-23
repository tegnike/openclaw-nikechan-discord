# pokemon - ポケモン対戦向け図鑑

pokeapi.co を使ってポケモンの対戦情報を提供する。

## Usage

```
@nikechan ガブリアスの種族値は？
@nikechan ピカチュウのタイプ教えて
@nikechan No.25のポケモンは？
```

## Output Format

### 基本情報
- 名前（日本語/英語）
- タイプ
- 特性（夢特性含む）
- 種族値（合計も表示）

### 対戦情報
- おすすめ性格
- おすすめ持ち物
- 役割（物理アタッカー/特殊アタッカー/サポートなど）

## API Endpoint

https://pokeapi.co/api/v2/pokemon/{name-or-id}
https://pokeapi.co/api/v2/pokemon-species/{id} (日本語名取得用)
