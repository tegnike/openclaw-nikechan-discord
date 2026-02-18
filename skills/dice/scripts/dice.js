#!/usr/bin/env node

// BCDice風ダイスロールスクリプト
// 使い方: node dice.js "1d100" または node dice.js "2d10+5"

function parseDiceNotation(notation) {
  // 表記をパース: [個数]d[面数][+修正値][-修正値]
  const match = notation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
  
  if (!match) {
    return null;
  }
  
  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);
  const modifier = parseInt(match[3] || '0', 10);
  
  return { count, sides, modifier };
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDie(sides));
  }
  return results;
}

function formatResult(rolls, modifier, total) {
  let output = `[${rolls.join(', ')}]`;
  
  if (modifier !== 0) {
    const sign = modifier > 0 ? '+' : '';
    output += ` ${sign}${modifier}`;
  }
  
  output += ` = ${total}`;
  
  return output;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使い方: node dice.js "1d100"');
    console.log('例:');
    console.log('  node dice.js "1d100"   # 100面ダイス1個');
    console.log('  node dice.js "2d10"    # 10面ダイス2個');
    console.log('  node dice.js "1d10+5"  # 10面ダイス1個 + 5');
    console.log('  node dice.js "3d6-2"   # 6面ダイス3個 - 2');
    process.exit(1);
  }
  
  const notation = args[0];
  const parsed = parseDiceNotation(notation);
  
  if (!parsed) {
    console.log(`エラー: "${notation}" は無効な表記です`);
    process.exit(1);
  }
  
  const { count, sides, modifier } = parsed;
  
  // ダイスを振る
  const rolls = rollDice(count, sides);
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + modifier;
  
  // 結果を表示
  console.log(`${notation} → ${formatResult(rolls, modifier, total)}`);
}

main();
