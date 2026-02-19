// GLBファイルからアニメーション情報を抽出
import { readFileSync } from 'fs';

const glbPath = process.argv[2];
if (!glbPath) {
  console.log('Usage: node tools/check-glb-animations.js <path/to/file.glb>');
  process.exit(1);
}

const buffer = readFileSync(glbPath);

// GLB header
const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);
const totalLength = buffer.readUInt32LE(8);

console.log('=== GLB Header ===');
console.log('Magic:', magic.toString(16), '(0x46546C67 = glTF)');
console.log('Version:', version);
console.log('Total size:', totalLength, 'bytes');

if (magic !== 0x46546C67) {
  console.log('Not a valid GLB file');
  process.exit(1);
}

// First chunk (JSON)
const chunk0Length = buffer.readUInt32LE(12);
const chunk0Type = buffer.readUInt32LE(16);
const chunk0Data = buffer.subarray(20, 20 + chunk0Length);

console.log('\n=== JSON Chunk ===');
console.log('Length:', chunk0Length);
console.log('Type:', chunk0Type.toString(16), '(0x4E4F534A = JSON)');

const jsonString = chunk0Data.toString('utf8');
const json = JSON.parse(jsonString);

console.log('\n=== GLTF Content ===');
console.log('Asset:', JSON.stringify(json.asset));
console.log('Scenes:', json.scenes?.length || 0);
console.log('Nodes:', json.nodes?.length || 0);
console.log('Meshes:', json.meshes?.length || 0);
console.log('Animations:', json.animations?.length || 0);

if (json.animations && json.animations.length > 0) {
  console.log('\n=== Animation Details ===');
  json.animations.forEach((anim, i) => {
    console.log(`Animation ${i}:`, anim.name || '(unnamed)');
    console.log('  Channels:', anim.channels?.length || 0);
    console.log('  Samplers:', anim.samplers?.length || 0);
    if (anim.channels) {
      anim.channels.forEach((ch, j) => {
        const target = ch.target;
        console.log(`  Channel ${j}: node=${target.node}, path=${target.path}`);
      });
    }
  });
} else {
  console.log('\n⚠️ No animations found in this GLB file');
}

// List available skins/bones
if (json.skins) {
  console.log('\n=== Skins/Bones ===');
  console.log('Skins:', json.skins.length);
}
