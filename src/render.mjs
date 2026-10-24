// Draw a card: Satori lays the element tree out as SVG with the fonts, and
// resvg (WebAssembly, so the same bytes run on this Mac and on Lambda) turns
// that into a PNG.
//
// The fonts are static Inter (400, 500, 600) and Inter Tight (700, 800) from
// Fontsource 5.3.0, the release the sites' shared/fonts come from. Satori
// reads WOFF but not WOFF2 or variable fonts, so the card carries its own
// static copies (tools/package.mjs puts them beside the bundle as fonts/).
//
// Those fonts have no emoji, so Satori asks for each one and gets Twemoji's
// SVG (@twemoji/svg 15.0.0, jdecked's Twemoji, graphics CC-BY 4.0), drawn as
// an image in the line. They sit beside the fonts as emoji/.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori from 'satori';
import fs from 'node:fs/promises';
import path from 'node:path';
import { HEIGHT, WIDTH } from './card.mjs';

export const FONTS = [
  ['Inter', 400, 'inter'],
  ['Inter', 500, 'inter'],
  ['Inter', 600, 'inter'],
  ['Inter Tight', 700, 'inter-tight'],
  ['Inter Tight', 800, 'inter-tight'],
].flatMap(([name, weight, file]) =>
  ['latin', 'latin-ext'].map((subset) => ({ name, weight, file: `${file}-${subset}-${weight}-normal.woff` })),
);

const ZWJ = 0x200d;
const VS16 = 0xfe0f;

const svgName = (points) => `${points.map((point) => point.toString(16)).join('-')}.svg`;

/** Twemoji's files to try for an emoji: its code points in hex, without
    U+FE0F unless it is a joined (ZWJ) sequence, the way Twemoji names them;
    then without U+FE0F at all, for the few joined ones Twemoji names bare. */
export function emojiFiles(segment) {
  const points = [...segment].map((c) => c.codePointAt(0));
  const bare = points.filter((point) => point !== VS16);
  return [...new Set([svgName(points.includes(ZWJ) ? points : bare), svgName(bare)])];
}

// An emoji newer than the set draws as nothing rather than a missing-glyph box.
const BLANK = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"/>',
).toString('base64')}`;

const emoji = new Map();

/** Satori's loadAdditionalAsset: an emoji's image; nothing for other scripts. */
export function emojiAsset(dir) {
  return async (languageCode, segment) => {
    if (languageCode !== 'emoji') return [];
    const [file, ...rest] = emojiFiles(segment);
    if (!emoji.has(file)) {
      let uri = BLANK;
      for (const name of [file, ...rest]) {
        const data = await fs.readFile(path.join(dir, 'emoji', name)).catch(() => null);
        if (data) {
          uri = `data:image/svg+xml;base64,${data.toString('base64')}`;
          break;
        }
      }
      emoji.set(file, uri);
    }
    return emoji.get(file);
  };
}

let ready;

/** Load the fonts and resvg once per process. dir holds fonts/ and resvg.wasm. */
export function prepare(dir) {
  ready ??= (async () => {
    const [wasm, ...fonts] = await Promise.all([
      fs.readFile(path.join(dir, 'resvg.wasm')),
      ...FONTS.map((font) => fs.readFile(path.join(dir, 'fonts', font.file))),
    ]);
    await initWasm(wasm);
    return FONTS.map((font, i) => ({ name: font.name, weight: font.weight, style: 'normal', data: fonts[i] }));
  })();
  ready.catch(() => {
    ready = undefined;
  });
  return ready;
}

/** The PNG for an element tree. */
export async function render(element, dir) {
  const fonts = await prepare(dir);
  const svg = await satori(element, { width: WIDTH, height: HEIGHT, fonts, loadAdditionalAsset: emojiAsset(dir) });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH }, font: { loadSystemFonts: false } });
  const image = resvg.render();
  const png = image.asPng();
  image.free();
  resvg.free();
  return Buffer.from(png);
}
