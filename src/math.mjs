// A way's math, drawn from its LaTeX the way roadsignmath.xyz draws it: MathJax 3.2.2 (the
// version the site pins), TeX in with only the base package, SVG out with every glyph a path,
// so no font is needed and resvg draws it as an image in the card. The colour is the card's,
// set in place of MathJax's currentColor, which an image has nothing to inherit.
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document('', {
  InputJax: new TeX({ packages: ['base'] }),
  OutputJax: new SVG({ fontCache: 'local' }),
});

// Far past any way a sign could hold (the site's checker caps a way well under this).
const LIMIT = 400;

/** MathJax's SVG for tex: { markup, box, width, height }, box its viewBox and
 * width and height that box's size in MathJax's units (1000 to the em), or
 * null when there is none to draw: no TeX, too long, or TeX MathJax marks as
 * an error. The markup draws in currentColor. */
export function mathSvg(tex) {
  if (typeof tex !== 'string' || !tex.trim() || tex.length > LIMIT) return null;
  let markup;
  try {
    markup = adaptor.innerHTML(doc.convert(tex, { display: true }));
  } catch {
    return null;
  }
  if (markup.includes('data-mml-node="merror"')) return null;
  const box = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/.exec(markup);
  if (!box) return null;
  const [width, height] = [Number(box[3]), Number(box[4])];
  if (!(width > 0 && height > 0)) return null;
  return { markup, box: box.slice(1).join(' '), width, height };
}

// A soft shadow under the glyphs, in MathJax's units, so white math reads
// over a bright sky.
const SHADOW =
  '<defs><filter id="shadow" x="-5%" y="-20%" width="110%" height="140%">' +
  '<feDropShadow dx="0" dy="24" stdDeviation="36" flood-color="#000" flood-opacity="0.6"/></filter></defs>';

/** The math for tex as an image in color: { src, ratio, units }, ratio its
 * width over its height and units its height in MathJax's units (1000 to the
 * em, so a fraction is taller than a sum at the same size), or null. shadow
 * sets a soft shadow under it. */
export function mathImage(tex, color, { shadow = false } = {}) {
  const math = mathSvg(tex);
  if (!math) return null;
  // Sized by the card, not in ex; drawn in the card's colour.
  let markup = math.markup
    .replace(/ style="[^"]*"/, '')
    .replace(/ width="[^"]*"/, ` width="${math.width}"`)
    .replace(/ height="[^"]*"/, ` height="${math.height}"`)
    .replaceAll('currentColor', color);
  if (shadow) markup = markup.replace(/^(<svg[^>]*>)([\s\S]*)<\/svg>$/, `$1${SHADOW}<g filter="url(#shadow)">$2</g></svg>`);
  return {
    src: `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`,
    ratio: math.width / math.height,
    units: math.height,
  };
}
