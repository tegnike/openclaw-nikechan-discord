#!/usr/bin/env node
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { basename } from 'path';

const UPLOAD_URL = 'https://nike-upload.maymai.dev/upload/';

async function uploadFile(filePath) {
  const stats = await stat(filePath);
  const fileName = basename(filePath);

  const stream = createReadStream(filePath);
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);

  const response = await fetch(UPLOAD_URL + fileName, {
    method: 'PUT',
    body: buffer,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stats.size
    }
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('Upload successful!');
  console.log('URL:', data.url || `https://nike-upload.maymai.dev/files/${data.key}`);
  console.log('Key:', data.key);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node tools/upload.mjs <file>');
  process.exit(1);
}

uploadFile(filePath).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
