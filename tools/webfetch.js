// bun webfetch - 高速fetch ツール（curl代替）
const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('-'));
const outputFile = args.includes('-o') ? args[args.indexOf('-o') + 1] : null;
const showHelp = args.includes('-h') || args.includes('--help');

if (showHelp || !url) {
  console.log(`使い方: bun tools/webfetch.js <URL> [-o <ファイル名>]
  URL       取得するURL
  -o FILE   ファイルに保存（指定なければ標準出力）
  -h        このヘルプを表示

例:
  bun tools/webfetch.js https://example.com
  bun tools/webfetch.js https://example.com/install.sh -o install.sh`);
  process.exit(url ? 0 : 1);
}

try {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`HTTPエラー: ${response.status}`);
    process.exit(1);
  }
  const text = await response.text();

  if (outputFile) {
    await Bun.write(outputFile, text);
    console.log(`保存完了: ${outputFile} (${text.length} bytes)`);
  } else {
    console.log(text);
  }
} catch (error) {
  console.error(`エラー: ${error.message}`);
  process.exit(1);
}
