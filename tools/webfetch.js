#!/usr/bin/env node
// curl代用ツール（sandbox環境用）

const fs = require('fs');
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
let url = null;
let outputFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' && args[i + 1]) {
    outputFile = args[i + 1];
    i++;
  } else if (!args[i].startsWith('-')) {
    url = args[i];
  }
}

if (!url) {
  console.error('Usage: node webfetch.js <URL> [-o output_file]');
  process.exit(1);
}

const client = url.startsWith('https') ? https : http;

client.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NikechanBot/1.0)'
  }
}, (res) => {
  // リダイレクト対応
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    const redirectUrl = res.headers.location;
    const redirectClient = redirectUrl.startsWith('https') ? https : http;
    redirectClient.get(redirectUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NikechanBot/1.0)'
      }
    }, handleResponse);
    return;
  }
  
  handleResponse(res);
}).on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

function handleResponse(res) {
  const chunks = [];
  res.on('data', (chunk) => { chunks.push(chunk); });
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    if (outputFile) {
      fs.writeFileSync(outputFile, buffer);
      console.log(`Saved to ${outputFile} (${buffer.length} bytes)`);
    } else {
      console.log(buffer.toString('utf8'));
    }
  });
}
