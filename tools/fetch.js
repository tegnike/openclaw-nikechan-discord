// fetch tool - URL取得・ダウンロード（curl代替）
// テキストもバイナリも両対応

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('-'));
const outputFile = args.includes('-o') ? args[args.indexOf('-o') + 1] : null;
const showHelp = args.includes('-h') || args.includes('--help');
const binaryMode = args.includes('-b') || args.includes('--binary');

if (showHelp || !url) {
  console.log(`使い方: bun tools/fetch.js <URL> [-o <ファイル名>] [-b]
  URL       取得するURL
  -o FILE   ファイルに保存（指定なければ標準出力）
  -b        バイナリモード（画像・ZIP等）
  -h        このヘルプを表示

例:
  bun tools/fetch.js https://example.com
  bun tools/fetch.js https://example.com/file.zip -o file.zip -b
  bun tools/fetch.js https://example.com/image.png -o image.png -b`);
  process.exit(url ? 0 : 1);
}

try {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`HTTPエラー: ${response.status}`);
    process.exit(1);
  }

  if (outputFile) {
    if (binaryMode) {
      // バイナリ保存
      const buffer = await response.arrayBuffer();
      await Bun.write(outputFile, buffer);
      const size = buffer.byteLength;
      const sizeStr = size > 1024 * 1024 
        ? `${(size / 1024 / 1024).toFixed(2)} MB`
        : `${(size / 1024).toFixed(2)} KB`;
      console.log(`保存完了: ${outputFile} (${sizeStr})`);
    } else {
      // テキスト保存
      const text = await response.text();
      await Bun.write(outputFile, text);
      console.log(`保存完了: ${outputFile} (${text.length} bytes)`);
    }
  } else {
    // 標準出力（テキストのみ）
    const text = await response.text();
    console.log(text);
  }
} catch (error) {
  console.error(`エラー: ${error.message}`);
  process.exit(1);
}
