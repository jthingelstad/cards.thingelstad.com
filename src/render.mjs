// Draw a card: Satori lays the element tree out as SVG with the fonts, and
// resvg (WebAssembly, so the same bytes run on this Mac and on Lambda) turns
// that into a PNG.
//
// The fonts are static Inter (400, 500, 600) and Inter Tight (700, 800) from
// Fontsource 5.3.0, the release the sites' shared/fonts come from. Satori
// reads WOFF but not WOFF2 or variable fonts, so the card carries its own
// static copies (tools/package.mjs puts them beside the bundle as fonts/).
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
  const svg = await satori(element, { width: WIDTH, height: HEIGHT, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH }, font: { loadSystemFonts: false } });
  const image = resvg.render();
  const png = image.asPng();
  image.free();
  resvg.free();
  return Buffer.from(png);
}
