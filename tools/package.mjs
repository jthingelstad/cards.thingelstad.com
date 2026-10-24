// Package the card maker for Lambda.
//
//   node tools/package.mjs     bundle, stage and zip into .build/; no AWS
//
// The zip holds index.mjs (src/handler.mjs bundled by esbuild), package.json,
// resvg.wasm and fonts/. .build/assets/ holds the same resvg.wasm and fonts/
// for local renders (tools/render.mjs, the tests). The zip's key,
// code/<sha256>.zip, hashes the entries' names and contents rather than the
// zip's bytes, so the same source gives the same key on any machine and a
// deploy of an unchanged package has nothing to do (the approach Linking
// Things settled on, 2026-10-24).
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { FONTS } from '../src/render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, '.build');
export const ASSETS = path.join(OUT, 'assets');

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** resvg's WebAssembly and the fonts, as zip entries. */
export async function assets() {
  const fontDir = (file) =>
    path.join(ROOT, 'node_modules/@fontsource', file.startsWith('inter-tight') ? 'inter-tight' : 'inter', 'files', file);
  return [
    { name: 'resvg.wasm', data: await fs.readFile(path.join(ROOT, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')) },
    ...(await Promise.all(FONTS.map(async ({ file }) => ({ name: `fonts/${file}`, data: await fs.readFile(fontDir(file)) })))),
  ];
}

/** Write the assets to .build/assets/ for local renders. */
export async function stageAssets() {
  for (const { name, data } of await assets()) {
    await fs.mkdir(path.dirname(path.join(ASSETS, name)), { recursive: true });
    await fs.writeFile(path.join(ASSETS, name), data);
  }
  return ASSETS;
}

// 1980-01-01, the earliest DOS date, for every entry.
const DOS_DATE = (1 << 5) | 1;

/** A zip of the entries, in name order, deflated. */
export function zip(entries) {
  const files = [...entries].sort((a, b) => (a.name < b.name ? -1 : 1));
  const local = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const file = Buffer.from(name, 'utf8');
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(DOS_DATE, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(packed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(file.length, 26);
    local.push(header, file, packed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE((3 << 8) | 20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(DOS_DATE, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(file.length, 28);
    entry.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, file);
    offset += header.length + file.length + packed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

/** code/<hash of the entries' names and contents>.zip */
export function contentKey(entries) {
  const hash = createHash('sha256');
  for (const { name, data } of [...entries].sort((a, b) => (a.name < b.name ? -1 : 1)))
    hash.update(`${name}\n${sha256(data)}\n`);
  return `code/${hash.digest('hex')}.zip`;
}

async function bundle() {
  const { outputFiles } = await build({
    entryPoints: [path.join(ROOT, 'src/handler.mjs')],
    bundle: true,
    write: false,
    outfile: 'index.mjs',
    platform: 'node',
    target: 'node24',
    format: 'esm',
    legalComments: 'none',
    logLevel: 'error',
    banner: {
      js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
    },
  });
  return Buffer.from(outputFiles[0].contents);
}

export async function packageCards() {
  const entries = [
    { name: 'index.mjs', data: await bundle() },
    { name: 'package.json', data: Buffer.from('{"type":"module"}\n') },
    ...(await assets()),
  ];
  const archive = zip(entries);
  const digest = createHash('sha256').update(archive).digest();
  const manifest = {
    key: contentKey(entries),
    checksumSha256: digest.toString('base64'),
    size: archive.length,
    path: path.join(OUT, 'cards.zip'),
  };
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(manifest.path, archive);
  await fs.writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await stageAssets();
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { key, size, path: file } = await packageCards();
  console.log(JSON.stringify({ key, size, path: file }));
}
