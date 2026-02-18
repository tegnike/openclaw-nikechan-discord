#!/usr/bin/env bun

/**
 * 分割並列ダウンロードツール
 * 使い方: bun tools/chunk-download.js <URL> -o <output-file> [-c <chunk-count>]
 * 例: bun tools/chunk-download.js https://example.com/file.zip -o file.zip -c 8
 */

const args = process.argv.slice(2);
if (args.length < 3 || !args.includes('-o')) {
  console.log('使い方: bun tools/chunk-download.js <URL> -o <output-file> [-c <chunk-count>]');
  console.log('例: bun tools/chunk-download.js https://example.com/file.zip -o file.zip -c 8');
  process.exit(1);
}

const url = args[0];
const outputIndex = args.indexOf('-o');
const outputFile = args[outputIndex + 1];
const chunkIndex = args.indexOf('-c');
const chunkCount = chunkIndex !== -1 ? parseInt(args[chunkIndex + 1]) : 4;

async function getFileSize(url) {
  const res = await fetch(url, { method: 'HEAD' });
  const size = parseInt(res.headers.get('content-length'));
  const acceptRanges = res.headers.get('accept-ranges');
  return { size, acceptRanges: acceptRanges === 'bytes' };
}

async function downloadChunk(url, start, end, chunkNum) {
  console.log(`Chunk ${chunkNum}: ${start}-${end} ダウンロード開始...`);
  const res = await fetch(url, {
    headers: { 'Range': `bytes=${start}-${end}` }
  });
  if (!res.ok) {
    throw new Error(`Chunk ${chunkNum} failed: ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  console.log(`Chunk ${chunkNum}: 完了 (${buffer.byteLength} bytes)`);
  return { chunkNum, buffer, start };
}

async function main() {
  console.log(`URL: ${url}`);
  console.log(`出力: ${outputFile}`);
  console.log(`分割数: ${chunkCount}`);
  
  // ファイルサイズ取得
  const { size, acceptRanges } = await getFileSize(url);
  console.log(`ファイルサイズ: ${(size / 1024 / 1024).toFixed(2)} MB`);
  
  if (!acceptRanges) {
    console.log('警告: Range リクエスト対応してないかも...');
  }
  
  const chunkSize = Math.floor(size / chunkCount);
  const chunks = [];
  
  // 並列DL開始
  console.log('\nダウンロード開始...\n');
  
  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize;
    const end = i === chunkCount - 1 ? size - 1 : (i + 1) * chunkSize - 1;
    chunks.push(downloadChunk(url, start, end, i + 1));
  }
  
  const results = await Promise.all(chunks);
  
  // 順番通りにソート
  results.sort((a, b) => a.start - b.start);
  
  // 結合して保存
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const result of results) {
    combined.set(new Uint8Array(result.buffer), offset);
    offset += result.buffer.byteLength;
  }
  
  await Bun.write(outputFile, combined);
  console.log(`\n完了！保存先: ${outputFile}`);
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
