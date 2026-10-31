// The card's layout, 1200 x 630, as the element tree Satori draws.
//
// Words first, in the blog's type: Inter Tight 800 for a title, Inter for
// everything else. Over the words, a kicker (the date, an issue's number, an
// episode's) in small capitals; then a short bar and the headline; under it
// all, a dark band that reads like the sites strip (Jamie Thingelstad, then
// the site's label in its dark-mode strip colour) with the host on the right.
//
// Decided with Jamie, 2026-10-24: the full canvas, no photo of Jamie, and
// photo posts get this card too. Weekly Thing issues and Another Thing
// episodes got cards on 2026-10-25 (Jamie: "Weekly Thing and Another Thing
// issues should get custom share images with cards.thingelstad.com
// solution."), and richer the same day (Jamie: "make it rich and inviting
// and equal to the quality of the thing it is previewing"): an issue over its
// cover, or on the newsletter's blue under a large W, its logo mark; an
// episode on the show's own slate with its three dots, its number, its
// running time and a listen button; and the newsletter's front page with a
// card of its own, the hero line over the newest cover.
//
// Then the design pass (2026-10-25, the canvas at
// claude.ai/artifact/TF23AaDQfNUH4WibFtdZpb; Jamie: "Approved: build and
// deploy the cards.thingelstad.com redesign (dark Links cards, black blog
// cards, photo-card polish, square photos on black), first sentence as
// headline only when short"): every card is dark. A blog post with no photo
// is white on black ("blog: prefer the black ground"), a square photo stands
// full height beside its words on black, a screenshot runs off the card's
// corner, and a saved link is drawn on black in the dark-mode link blue
// ("color: dark mode"). An episode's three dots stand large, the crimson one
// its play button (Jamie: "we didn't get a design for Another Thing podcast
// episodes… we need that one too"). Headlines are broken into even lines here (breakLines),
// and counts are pills. Things 4 Good, the family's candle fundraiser, joined
// the same day in its own site's type (t4gCard).

import { mathImage, mathSvg } from './math.mjs';

export const WIDTH = 1200;
export const HEIGHT = 630;

const INK = '#16161a';
const WHITE = '#ffffff';
// The dark band and the dark-mode strip's grey and ink.
const GROUND = '#0e0e12';
const LABEL = '#9d9daa';
const LIGHT = '#ececf0';
// Words under a headline, on black.
const SOFT = '#c9c9d3';

const h = (type, style, ...children) => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

const tree = (type, style, children) => ({ type, props: { style, children: children.filter(Boolean) } });

const img = (src, style) => ({ type: 'img', props: { src, style } });

/** "October 15, 2026", in Jamie's time zone. */
export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/** Up to limit characters, ended at a sentence where one fits, else at a word. */
export function excerpt(text, limit) {
  if (text.length <= limit) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+["'”’)]*\s*/g) ?? [];
  let kept = '';
  for (const sentence of sentences) {
    if ((kept + sentence).trim().length > limit) break;
    kept += sentence;
  }
  if (kept.trim().length >= limit * 0.5) return kept.trim();
  const cut = text.slice(0, limit + 1);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > limit * 0.6 ? space : limit).replace(/[\s,;:–—-]+$/, '')}…`;
}

const PAD = 64;
const BAND = 68;
const ABOVE = HEIGHT - BAND;
const FILL = { position: 'absolute', top: 0, left: 0, width: WIDTH, height: ABOVE };

// Type sizes by length, with lines kept so nothing runs into the band.
const titleSize = (n, photo) =>
  photo ? (n <= 22 ? 72 : n <= 44 ? 60 : 50) : n <= 26 ? 100 : n <= 50 ? 80 : 64;

// Smaller still when the longest word would not fit on a line: Satori breaks
// no word, so "Tournament" at 72px beside a photo was cut to "Tourname…".
// em is a generous average advance for the face, so a word fits with room.
export function fitSize(size, text, width, em) {
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  return Math.max(28, Math.min(size, Math.floor(width / (em * longest))));
}

/** A headline as even lines: the fewest lines it needs at size in width, its
 * words shared out so the longest line is as short as it can be (no word
 * left alone on the last line), or null when it needs more than most lines
 * or a word is wider than a line, for Satori to wrap and clamp. Satori's own
 * textWrap: 'balance' breaks with a clamp (it balances for one line more than
 * it keeps). em overstates the face's average advance, so a line drawn is
 * never wider than width. */
export function breakLines(text, { size, width, most, em = 0.55 }) {
  const words = text.split(/\s+/).filter(Boolean);
  const perLine = Math.floor(width / (em * size));
  const length = (from, to) => words.slice(from, to).join(' ').length;
  for (let lines = Math.max(1, Math.ceil(length(0, words.length) / perLine)); lines <= Math.min(most, words.length); lines++) {
    if (lines === 1) return length(0, words.length) <= perLine ? [words.join(' ')] : null;
    // widest[k][j]: the narrowest widest line that sets the first j words on k lines.
    const widest = Array.from({ length: lines + 1 }, () => new Array(words.length + 1).fill(Infinity));
    const cut = Array.from({ length: lines + 1 }, () => new Array(words.length + 1).fill(0));
    widest[0][0] = 0;
    for (let k = 1; k <= lines; k++)
      for (let j = k; j <= words.length; j++)
        for (let i = k - 1; i < j; i++) {
          const w = Math.max(widest[k - 1][i], length(i, j));
          if (w < widest[k][j]) [widest[k][j], cut[k][j]] = [w, i];
        }
    if (widest[lines][words.length] > perLine) continue;
    const out = [];
    for (let k = lines, j = words.length; k > 0; k--) {
      out.unshift(words.slice(cut[k][j], j).join(' '));
      j = cut[k][j];
    }
    return out;
  }
  return null;
}

const TITLE = { fontFamily: 'Inter Tight', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.025em' };

/** A headline in its even lines, one block each, or one clamped block.
 * rule underlines each line with a bar of that colour, under its descenders,
 * where Satori's own underline runs through them; the clamped block falls
 * back to that underline. em is the face's average advance, for a face
 * narrower than Inter Tight. */
function headline(text, style, { width, lines, rule, em }) {
  const broken = breakLines(text, { size: style.fontSize, width, most: lines, em });
  const thickness = Math.max(4, Math.round(style.fontSize / 16));
  if (!broken) {
    const underline = rule ? { textDecoration: 'underline', textDecorationColor: rule, textDecorationThickness: thickness, textDecorationSkipInk: 'none' } : {};
    return h('div', { display: 'block', ...style, ...underline, lineClamp: lines }, text);
  }
  const underline = rule ? { alignSelf: 'flex-start', borderBottom: `${thickness}px solid ${rule}`, marginBottom: Math.round(style.fontSize * 0.12) } : {};
  return tree('div', { display: 'flex', flexDirection: 'column' }, broken.map((line) => h('div', { display: 'block', ...style, ...underline }, line)));
}

/** The words before a headline: the kicker, in small capitals. */
const kicker = (text, color, mark) =>
  tree('div', { display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: 700, letterSpacing: '0.12em', color }, [
    mark && img(mark, { width: 40, height: 40, marginRight: 14 }),
    h('div', { display: 'block', lineClamp: 2 }, (text || ' ').toUpperCase()),
  ]);

/** The short bar over a headline. */
const bar = (color) => h('div', { display: 'flex', width: 56, height: 5, borderRadius: 3, backgroundColor: color, marginBottom: 18 });

/** An issue's counts as [number, word] pairs, leaving out what it has none of. */
export function countParts(counts) {
  const part = (n, one, many) => (n > 0 ? [[n, n === 1 ? one : many]] : []);
  return [...part(counts?.links, 'link', 'links'), ...part(counts?.journal, 'journal entry', 'journal entries')];
}

const number = (n) => new Intl.NumberFormat('en-US').format(n);

const pill = ([n, word]) =>
  h(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      marginRight: 10,
      padding: '5px 14px',
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.14)',
      border: '1px solid rgba(255,255,255,0.22)',
      fontSize: 20,
      fontWeight: 500,
    },
    h('div', { display: 'block', fontFamily: 'Inter Tight', fontWeight: 800, marginRight: 7 }, number(n)),
    h('div', { display: 'block' }, word),
  );

// The newsletter's blues: its logo circle and strip mark, a deep end for the
// gradient, and the light and pale tints that read on them.
const WT = { circle: '#1f6fd6', blue: '#1a5eb6', deep: '#0d356e', light: '#8fbcf5', pale: '#d6e6fb' };
// The show's artwork: slate, grey dots and the site's crimson, and its
// dark-mode tint for the bar.
const AT = { slate: '#34495e', high: '#3f5872', deep: '#1f2d3b', dot: '#7c8a99', crimson: '#c8174a', light: '#f58aa3', pale: '#d7dee6' };
// Linking Things on black: the dark-mode link blue.
const LINKS = { ground: '#121218', accent: '#78acf2' };

const svg = (markup) => `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`;
// The W of the newsletter's logo (its favicon's path), cropped to the letter.
const W_PATH =
  'M8.61 10.6 6 10.45 6.27 9.14H12.47L12.19 10.45L9.73 10.6ZM8.5 22.86 7.19 9.14H10.67L11.23 20.5H11.17L11.99 17.71L15.66 9.14H18.18L19.22 20.5H19.18L19.89 17.71L23.41 9.14H24.94L19.06 22.86H16.45L15.36 12.04H15.64L14.84 14.52L11.15 22.86ZM16.14 10.6 13.63 10.45 13.9 9.14H20.14L19.87 10.45L17.37 10.6ZM23.14 10.6 21.39 10.45 21.66 9.14H26L25.73 10.45L23.89 10.6Z';
const W_BIG = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="5.5 8.6 21 14.8"><path fill="#ffffff" fill-opacity="0.09" d="${W_PATH}"/></svg>`);
const W_LOGO = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${WT.circle}"/><path fill="#ffffff" d="${W_PATH}"/></svg>`);
const PLAY = svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M8 5.5v13l10.5-6.5z"/></svg>');
const ARROW = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${LINKS.accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
);

/** "11 min", "1 hr 5 min": an episode's running time, as its page says it. */
export function durationLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  return `${minutes} min`;
}

// The owner's name, the site's label and its host, on the dark band. Beside a
// photo the band runs under the words only, a size smaller.
const band = (site, { width = WIDTH, fontSize = 22, gap = 28 } = {}) =>
  h(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      width,
      height: BAND,
      flexShrink: 0,
      boxSizing: 'border-box',
      padding: '0 64px',
      backgroundColor: GROUND,
      borderTop: '1px solid rgba(255,255,255,0.10)',
      fontSize,
    },
    h('div', { display: 'block', color: LABEL }, site.owner),
    h('div', { display: 'block', marginLeft: gap, fontWeight: 600, color: site.mark ?? LIGHT }, site.label),
    h('div', { display: 'block', marginLeft: 'auto', fontWeight: 500, color: LABEL }, site.host),
  );

// A dark card: the backdrop layers fill the space above the band, the words
// sit over them in white, and the band closes it as on every card.
const darkCard = (backdrop, words, site, ground = INK) =>
  h(
    'div',
    { display: 'flex', flexDirection: 'column', width: WIDTH, height: HEIGHT, backgroundColor: ground, fontFamily: 'Inter', color: WHITE },
    tree('div', { display: 'flex', position: 'relative', width: WIDTH, height: ABOVE, flexShrink: 0, overflow: 'hidden' }, [
      ...backdrop,
      words,
    ]),
    band(site),
  );

// The words over a card, the kicker at the top and the rest at the foot.
const over = (top, foot, style = {}) =>
  tree(
    'div',
    { ...FILL, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', padding: `44px ${PAD}px 46px ${PAD}px`, color: WHITE, ...style },
    [top, foot],
  );

// The blog's photo posts over their photo (Jamie, 2026-10-25: "I think we
// can do image overlay on blog previews too"), when the photo is wide enough
// to fill the card and the words are a headline. These are Jamie's three
// calls on it:
export const OVERLAY = Object.freeze({
  // The narrowest photo drawn over, width / height: 1.3 keeps 4:3 and wider,
  // so a square or tall photo keeps its own half, uncropped.
  wide: 1.3,
  // The longest micropost drawn over, in characters. A titled post always
  // is; a longer micropost stands beside its photo.
  words: 80,
  // How dark the top of a photo is, under the date (and on every cover).
  top: 0.72,
});

/** Whether a blog post is drawn over its photo rather than beside it. */
export function overPhoto(post, photo, overlay = OVERLAY) {
  if (!photo || photo.screenshot || !(photo.width > 0 && photo.height > 0)) return false;
  if (photo.width / photo.height < overlay.wide) return false;
  return Boolean(post.title) || (Boolean(post.text) && post.text.length <= overlay.words);
}

const shade = (alpha) => `rgba(10,10,14,${alpha})`;

// A post over its photo, as an issue over its cover: the photo fills the card
// above the band, darkened at the top for the kicker, toward the bottom for
// the words and a little from the left behind them. A titled post shows its
// title and the start of its text; a micropost its own words as the
// headline. An issue with no cover is drawn on the newsletter's blue under
// its W.
function overCover(post, { site, photo, meta, counts, top, mark, accent }) {
  const width = WIDTH - 2 * PAD;
  const words = post.title || post.text;
  const n = words.length;
  // A micropost past 90 characters (only when OVERLAY.words lets one in)
  // steps down once more and takes a fourth line.
  const long = !post.title && n > 90;
  const size = fitSize(long ? 48 : n <= 28 ? 88 : n <= 56 ? 72 : 60, words, width, 0.64);
  const body = post.title ? post.text : '';
  const shadow = photo ? '0 2px 18px rgba(0, 0, 0, 0.45)' : '0 2px 12px rgba(4, 20, 50, 0.35)';
  const backdrop = photo
    ? [
        img(photo.src, { ...FILL, objectFit: 'cover', objectPosition: 'center' }),
        h('div', {
          ...FILL,
          display: 'flex',
          backgroundImage: `linear-gradient(180deg, ${shade(top)} 0%, ${shade(top / 3)} 15%, ${shade(0)} 30%, ${shade(0.2)} 47%, ${shade(0.9)} 100%)`,
        }),
        h('div', { ...FILL, display: 'flex', backgroundImage: `linear-gradient(90deg, ${shade(0.5)} 0%, ${shade(0.15)} 45%, ${shade(0)} 70%)` }),
      ]
    : [
        h('div', { ...FILL, display: 'flex', backgroundImage: `linear-gradient(135deg, ${WT.circle} 0%, ${WT.blue} 38%, ${WT.deep} 100%)` }),
        img(W_BIG, { position: 'absolute', top: 36, left: 560, width: 680, height: 479 }),
      ];
  return darkCard(
    backdrop,
    over(
      kicker(meta, photo ? WHITE : WT.pale, mark),
      tree('div', { display: 'flex', flexDirection: 'column', width }, [
        bar(accent),
        headline(words, { ...TITLE, fontSize: size }, { width, lines: body ? 2 : long ? 4 : 3 }),
        body &&
          h('div', { display: 'block', marginTop: 18, fontSize: 26, lineHeight: 1.4, fontWeight: 500, lineClamp: 2 }, excerpt(body, 170)),
        counts.length > 0 && tree('div', { display: 'flex', marginTop: 20, textShadow: 'none' }, counts.map(pill)),
      ]),
      { textShadow: shadow, padding: `40px ${PAD}px 44px ${PAD}px` },
    ),
    site,
  );
}

// The newsletter's own card: its logo and name, then the front page's hero
// line (its accent in the light blue, its line breaks kept) over the newest
// cover, darkened to the left where the words are, with the archive's size.
function homeCard(post, { site, photo }) {
  const lines = post.headline.length ? post.headline : [[{ text: post.title, accent: false }]];
  const longest = Math.max(...lines.map((runs) => runs.reduce((n, run) => n + run.text.length, 0)));
  const size = Math.min(84, Math.floor((WIDTH * 0.62) / (0.56 * longest)));
  const facts = [
    post.counts?.issues ? `${number(post.counts.issues)} issues` : '',
    post.counts?.links ? `${number(post.counts.links)} links` : '',
  ].filter(Boolean);
  const backdrop = photo
    ? [
        img(photo.src, { ...FILL, objectFit: 'cover', objectPosition: 'center' }),
        h('div', {
          ...FILL,
          display: 'flex',
          backgroundImage: 'linear-gradient(90deg, rgba(6,18,38,0.92) 0%, rgba(6,18,38,0.78) 45%, rgba(6,18,38,0.25) 100%)',
        }),
      ]
    : [
        h('div', { ...FILL, display: 'flex', backgroundImage: `linear-gradient(135deg, ${WT.circle} 0%, ${WT.blue} 38%, ${WT.deep} 100%)` }),
        img(W_BIG, { position: 'absolute', top: 36, left: 560, width: 680, height: 479 }),
      ];
  return darkCard(
    backdrop,
    tree('div', { ...FILL, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', padding: `44px ${PAD}px 42px ${PAD}px`, color: WHITE, textShadow: '0 2px 16px rgba(0, 0, 0, 0.35)' }, [
      h(
        'div',
        { display: 'flex', alignItems: 'center' },
        img(W_LOGO, { width: 52, height: 52, marginRight: 16 }),
        h('div', { display: 'block', fontFamily: 'Inter Tight', fontWeight: 800, fontSize: 34, letterSpacing: '-0.015em' }, post.title || 'Weekly Thing'),
      ),
      tree('div', { display: 'flex', flexDirection: 'column' }, [
        post.kicker &&
          h('div', { display: 'block', marginBottom: 14, fontSize: 20, fontWeight: 700, letterSpacing: '0.12em', color: WT.pale }, post.kicker.toUpperCase()),
        ...lines.map((runs) =>
          h(
            'div',
            { display: 'flex', fontFamily: 'Inter Tight', fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: '-0.03em' },
            ...runs.map((run) => h('span', { color: run.accent ? WT.light : WHITE, whiteSpace: 'pre' }, run.text)),
          ),
        ),
        facts.length &&
          h('div', { display: 'block', marginTop: 22, fontSize: 24, fontWeight: 700, letterSpacing: '0.02em', color: WT.pale }, facts.join(' · ')),
      ]),
    ]),
    site,
  );
}

const dot = (color, size) => h('div', { display: 'flex', width: size, height: size, borderRadius: size / 2, backgroundColor: color, marginRight: size * 0.6 });

// An episode on the show's slate: its three dots and name, then the dots
// again, large, the crimson one its play button with the running time under
// it; at the foot the episode's number and date, its title and summary.
const BIG_DOT = 132;

function episodeCard(post, { site }) {
  const width = WIDTH - 2 * PAD;
  const n = post.title.length;
  const size = fitSize(n <= 26 ? 88 : n <= 52 ? 72 : 60, post.title, width, 0.64);
  const { number: no, seconds } = post.episode ?? {};
  const meta = [no ? `Episode ${no}` : '', formatDate(post.published)].filter(Boolean).join(' · ');
  const faint = () => h('div', { display: 'flex', width: BIG_DOT, height: BIG_DOT, borderRadius: BIG_DOT / 2, backgroundColor: 'rgba(255,255,255,0.09)', marginRight: 30 });
  return darkCard(
    [
      h('div', { ...FILL, display: 'flex', backgroundImage: `linear-gradient(160deg, ${AT.high} 0%, ${AT.slate} 42%, ${AT.deep} 100%)` }),
      h(
        'div',
        { position: 'absolute', top: 60, right: PAD, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
        h(
          'div',
          { display: 'flex' },
          faint(),
          faint(),
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: BIG_DOT,
              height: BIG_DOT,
              borderRadius: BIG_DOT / 2,
              backgroundColor: AT.crimson,
              boxShadow: '0 18px 48px rgba(200,23,74,0.45)',
            },
            img(PLAY, { width: 62, height: 62, marginLeft: 6 }),
          ),
        ),
        h(
          'div',
          { display: 'block', marginTop: 22, marginRight: 16, fontSize: 20, fontWeight: 700, letterSpacing: '0.12em', color: AT.pale },
          (seconds ? `Listen · ${durationLabel(seconds)}` : 'Listen').toUpperCase(),
        ),
      ),
    ],
    over(
      h(
        'div',
        { display: 'flex', alignItems: 'center' },
        dot(AT.dot, 16),
        dot(AT.dot, 16),
        dot(AT.crimson, 16),
        h('div', { display: 'block', marginLeft: 6, fontFamily: 'Inter Tight', fontWeight: 800, fontSize: 30, letterSpacing: '-0.01em' }, 'Another Thing'),
      ),
      tree('div', { display: 'flex', flexDirection: 'column', width }, [
        meta && h('div', { display: 'block', marginBottom: 18, fontSize: 20, fontWeight: 700, letterSpacing: '0.12em', color: AT.pale }, meta.toUpperCase()),
        bar(AT.light),
        headline(post.title, { ...TITLE, fontSize: size }, { width, lines: 2 }),
        post.text &&
          h('div', { display: 'block', marginTop: 18, maxWidth: 1000, fontSize: 28, lineHeight: 1.4, fontWeight: 500, color: AT.pale, lineClamp: 2 }, excerpt(post.text, 170)),
      ]),
      { padding: `46px ${PAD}px 46px ${PAD}px` },
    ),
    site,
  );
}

// A micropost's words, by length: the shorter, the larger and bolder.
function noteStyle(n, photo) {
  if (n <= 40) return { fontSize: photo ? 56 : 84, fontFamily: 'Inter Tight', fontWeight: 800, lines: 4 };
  if (n <= 90) return { fontSize: photo ? 50 : 68, fontFamily: 'Inter Tight', fontWeight: 800, lines: 4 };
  if (n <= 150) return { fontSize: photo ? 38 : 46, fontFamily: 'Inter', fontWeight: 500, lines: photo ? 7 : 6 };
  return { fontSize: photo ? 32 : 38, fontFamily: 'Inter', fontWeight: 500, lines: photo ? 8 : 7 };
}

/** A micropost's first sentence as its headline and the rest under it, when
 * the post runs past a headline's worth and its first sentence is short;
 * else null, and the whole post is set at one size (Jamie: "first sentence
 * as headline only when short"). */
export function lede(text) {
  if (text.length <= 90) return null;
  const match = /^(.+?[.!?…]+["'”’)]*)\s+(.+)$/s.exec(text);
  if (!match) return null;
  const [, first, rest] = match;
  return first.length >= 12 && first.length <= 60 ? { first, rest } : null;
}

/** A blog post's words in a column of width: a title and the start of its
 * text, a micropost's first sentence over the rest, or the micropost whole. */
function postWords(post, { width, photo }) {
  if (post.title) {
    const size = fitSize(titleSize(post.title.length, photo), post.title, width, 0.64);
    return [
      headline(post.title, { ...TITLE, fontSize: size }, { width, lines: photo ? 4 : 3 }),
      post.text &&
        h(
          'div',
          { display: 'block', marginTop: photo ? 20 : 24, fontSize: photo ? 25 : 28, lineHeight: 1.45, fontWeight: 500, color: SOFT, maxWidth: 1040, lineClamp: photo ? 3 : 2 },
          excerpt(post.text, photo ? 150 : 220),
        ),
    ];
  }
  if (!post.text) return [];
  const opening = photo ? null : lede(post.text);
  if (opening) {
    const size = fitSize(opening.first.length <= 30 ? 84 : 72, opening.first, width, 0.64);
    return [
      headline(opening.first, { ...TITLE, fontSize: size }, { width, lines: 2 }),
      h('div', { display: 'block', marginTop: 22, fontSize: 28, lineHeight: 1.45, fontWeight: 500, color: SOFT, maxWidth: 1040, lineClamp: 3 }, excerpt(opening.rest, 220)),
    ];
  }
  const text = excerpt(post.text, photo ? 200 : 260);
  const { lines, ...style } = noteStyle(text.length, photo);
  const sans = style.fontFamily === 'Inter';
  style.fontSize = fitSize(style.fontSize, text, width, sans ? 0.62 : 0.64);
  return [
    h(
      'div',
      { display: 'block', ...style, lineHeight: sans ? 1.32 : 1.04, letterSpacing: sans ? '-0.01em' : '-0.025em', color: sans ? '#f4f4f7' : WHITE, lineClamp: lines },
      text,
    ),
  ];
}

// A blog post with no photo: its words in white on black (Jamie: "blog:
// prefer the black ground").
function inkPost(post, { site, meta }) {
  const width = WIDTH - 2 * PAD;
  return darkCard(
    [],
    over(kicker(meta, LABEL), tree('div', { display: 'flex', flexDirection: 'column', width }, [bar(WHITE), ...postWords(post, { width, photo: false })])),
    site,
  );
}

// A square or tall photo stands full height on the right, faded into the
// black beside it, with the words on the left and the band under them only.
function besidePhoto(post, { site, photo, meta }) {
  const half = WIDTH / 2;
  const width = half - PAD - 40;
  return h(
    'div',
    { display: 'flex', position: 'relative', width: WIDTH, height: HEIGHT, backgroundColor: INK, fontFamily: 'Inter', color: WHITE },
    img(photo.src, { position: 'absolute', top: 0, left: half, width: half, height: HEIGHT, objectFit: 'cover', objectPosition: 'center' }),
    h('div', {
      position: 'absolute',
      top: 0,
      left: half,
      width: 160,
      height: HEIGHT,
      display: 'flex',
      backgroundImage: `linear-gradient(90deg, ${INK} 0%, rgba(22,22,26,0.6) 40%, rgba(22,22,26,0) 100%)`,
    }),
    over(kicker(meta, SOFT), tree('div', { display: 'flex', flexDirection: 'column', width }, [bar(WHITE), ...postWords(post, { width, photo: true })]), {
      width: half,
      padding: `44px 40px 46px ${PAD}px`,
    }),
    h('div', { position: 'absolute', top: ABOVE, left: 0, display: 'flex' }, band(site, { width: half, fontSize: 20, gap: 22 })),
  );
}

// A screenshot runs off the card's right edge (and its foot, when tall),
// framed, beside the words.
const SHOT = { top: 64, left: 590, width: 700 };

function screenshotCard(post, { site, photo, meta }) {
  const width = SHOT.left - 30 - PAD - 32;
  const height = photo.width > 0 && photo.height > 0 ? Math.round((SHOT.width * photo.height) / photo.width) : ABOVE;
  return darkCard(
    [
      h(
        'div',
        {
          position: 'absolute',
          top: SHOT.top,
          left: SHOT.left,
          width: SHOT.width,
          height,
          display: 'flex',
          overflow: 'hidden',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
          backgroundColor: WHITE,
        },
        img(photo.src, { width: SHOT.width, height, objectFit: 'cover', objectPosition: 'top' }),
      ),
    ],
    over(kicker(meta, LABEL), tree('div', { display: 'flex', flexDirection: 'column', width }, [bar(WHITE), ...postWords(post, { width, photo: true })]), {
      width: SHOT.left - 30,
      padding: `44px 32px 46px ${PAD}px`,
    }),
    site,
  );
}

// A blog post: over its photo when overPhoto says so, a screenshot off the
// corner, any other photo beside its words, and no photo white on black.
function postCard(post, { site, photo, meta, rule }) {
  if (overPhoto(post, photo, rule)) return overCover(post, { site, photo, meta, counts: [], top: rule.top, accent: WHITE });
  if (photo?.screenshot) return screenshotCard(post, { site, photo, meta });
  if (photo) return besidePhoto(post, { site, photo, meta });
  return inkPost(post, { site, meta });
}

// A saved link, the way its record page reads, on black: the host it points
// at, the issues that carried it and the day saved, then the title in the
// dark-mode link blue's underline, and Jamie's note when there is one
// (sites.mjs reads only Jamie's own words). The host, very large and faint,
// fills the black behind it. Type steps down for a long title and again
// beside a note.
const linkTitleSize = (n, note) =>
  note ? (n <= 26 ? 80 : n <= 50 ? 64 : n <= 90 ? 52 : 44) : n <= 26 ? 104 : n <= 50 ? 84 : n <= 90 ? 64 : 52;

/** Up to limit characters, cut at a word: a title too long for its lines is
 * cut here, since a line Satori clamps loses its underline. */
export function clip(text, limit) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > limit * 0.6 ? space : limit).replace(/[\s,;:/|–—-]+$/, '')}…`;
}

const chip = (children, style = {}) =>
  tree(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      marginRight: 12,
      padding: '7px 16px 7px 12px',
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.16)',
      fontSize: 22,
      fontWeight: 600,
      ...style,
    },
    children,
  );

function linkCard(post, { site }) {
  const width = WIDTH - 2 * PAD;
  const note = post.text ? excerpt(post.text, 180) : '';
  const whole = post.title || post.host;
  const lines = note ? 2 : 3;
  const size = fitSize(linkTitleSize(whole.length, Boolean(note)), whole, width, 0.64);
  // Inter Tight at 800 runs about 0.5em a character, generously; the 0.9
  // leaves room for the words that don't fill a line.
  const title = clip(whole, Math.floor(((lines * width) / (0.5 * size)) * 0.9));
  const host = post.host ? clip(post.host, 34) : '';
  const issues = post.issues ?? [];
  const date = formatDate(post.published);
  const top = tree('div', { display: 'flex', alignItems: 'center' }, [
    host && chip([img(ARROW, { width: 22, height: 22, marginRight: 10 }), h('div', { display: 'block' }, host)]),
    ...issues.slice(0, 2).map((issue) =>
      chip([img(W_LOGO, { width: 26, height: 26, marginRight: 9 }), h('div', { display: 'block' }, `In ${issue}`)], {
        padding: '7px 16px 7px 9px',
        backgroundColor: 'rgba(31,111,214,0.22)',
        border: '1px solid rgba(120,172,242,0.45)',
        fontSize: 21,
        color: WT.pale,
      }),
    ),
    issues.length > 2 && chip([h('div', { display: 'block' }, `+${issues.length - 2}`)], { padding: '7px 16px', fontSize: 21, color: WT.pale }),
    date && h('div', { display: 'block', marginLeft: 6, fontSize: 20, fontWeight: 700, letterSpacing: '0.12em', color: LABEL }, `Saved ${date}`.toUpperCase()),
  ]);
  const words = tree('div', { display: 'flex', flexDirection: 'column', width }, [
    headline(title, { ...TITLE, fontSize: size, lineHeight: 1.12 }, { width, lines, rule: LINKS.accent }),
    note &&
      tree('div', { display: 'flex', marginTop: 30, maxWidth: 1040 }, [
        h('div', { display: 'block', fontFamily: 'Inter Tight', fontWeight: 800, fontSize: 84, lineHeight: 0.8, color: LINKS.accent, marginRight: 18 }, '“'),
        tree('div', { display: 'flex', flexDirection: 'column' }, [
          h('div', { display: 'block', fontSize: 30, lineHeight: 1.42, fontWeight: 500, color: LIGHT, lineClamp: 3 }, note),
          h('div', { display: 'block', marginTop: 12, fontSize: 20, fontWeight: 700, letterSpacing: '0.12em', color: LABEL }, 'JAMIE’S NOTE'),
        ]),
      ]),
  ]);
  const backdrop = host
    ? [
        h(
          'div',
          {
            position: 'absolute',
            top: note ? -70 : 248,
            left: note ? 300 : 380,
            display: 'block',
            fontFamily: 'Inter Tight',
            fontWeight: 800,
            fontSize: note ? 300 : 330,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            whiteSpace: 'nowrap',
            color: 'rgba(255,255,255,0.045)',
          },
          host,
        ),
      ]
    : [];
  return darkCard(backdrop, over(top, words), site, LINKS.ground);
}

// Things 4 Good, as its site reads (2026-10-25, the canvas at
// claude.ai/artifact/7knUfs7P2AEjjcnTrDLrea, direction B): a candle photo
// under warm dark, the page's eyebrow in candlelight capitals beside the
// site's candle, a marigold bar, the heading in Newsreader with its accent
// in the site's pale pine italic, a line in Hanken Grotesk, and the sale's
// facts as pills. Its own faces, since the site's are; the band is Inter, as
// on every card. A page whose photo can't be had keeps its words on the warm
// ground.
const T4G = {
  ground: '#1c140e',
  shade: (alpha) => `rgba(22,15,9,${alpha})`,
  eyebrow: '#f6c48a',
  marigold: '#ee8b26',
  pine: '#9fdcc6',
  cream: '#fffaf2',
  soft: 'rgba(255,248,236,0.84)',
};
// The site's favicon candle (its jar and flame), without its cream tile.
const T4G_CANDLE = svg(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="13 4 38 53"><circle cx="32" cy="38" r="17" fill="#EE8B26"/><circle cx="32" cy="38" r="11" fill="#C9701A"/><path d="M32 6c7 7 10 13 10 19 0 7-5 12-10 12S22 32 22 25c0-6 3-12 10-19Z" fill="#18876F"/><path d="M32 12c4 5 6 9 6 13 0 4-3 7-6 7s-6-3-6-7c0-4 2-8 6-13Z" fill="#FBE3C2"/></svg>',
);
const SERIF = { fontFamily: 'Newsreader', fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.02em' };

function t4gCard(post, { site, photo }) {
  const width = 940;
  const heading = post.headline || post.title;
  const accent = post.accent ?? '';
  const facts = post.facts ?? [];
  // Smaller when the heading runs long. Newsreader runs narrower than Inter
  // Tight, about 0.5em a character, so its lines are broken at 0.52.
  const longest = Math.max(heading.length, accent.length);
  const size = fitSize(accent ? (longest <= 22 ? 84 : 72) : heading.length <= 30 ? 84 : heading.length <= 56 ? 72 : 60, heading, width, 0.56);
  const backdrop = photo
    ? [
        img(photo.src, { ...FILL, objectFit: 'cover', objectPosition: 'center' }),
        h('div', {
          ...FILL,
          display: 'flex',
          backgroundImage: `linear-gradient(90deg, ${T4G.shade(0.95)} 0%, ${T4G.shade(0.86)} 40%, ${T4G.shade(0.35)} 72%, ${T4G.shade(0.15)} 100%)`,
        }),
        h('div', {
          ...FILL,
          display: 'flex',
          backgroundImage: `linear-gradient(180deg, ${T4G.shade(0.55)} 0%, ${T4G.shade(0)} 28%, ${T4G.shade(0)} 62%, ${T4G.shade(0.7)} 100%)`,
        }),
      ]
    : [h('div', { ...FILL, display: 'flex', backgroundImage: 'radial-gradient(circle at 88% 92%, rgba(238,139,38,0.34) 0%, rgba(238,139,38,0.12) 30%, rgba(28,20,14,0) 58%)' })];
  const fact = (text) =>
    h(
      'div',
      {
        display: 'flex',
        marginRight: 10,
        padding: '8px 18px',
        borderRadius: 999,
        backgroundColor: 'rgba(255,250,242,0.10)',
        border: '1px solid rgba(255,250,242,0.20)',
        fontSize: 20,
        fontWeight: 600,
        color: T4G.cream,
      },
      text,
    );
  return darkCard(
    backdrop,
    over(
      kicker(post.kicker, T4G.eyebrow, T4G_CANDLE),
      tree('div', { display: 'flex', flexDirection: 'column', width }, [
        bar(T4G.marigold),
        headline(heading, { ...SERIF, fontSize: size }, { width, lines: accent ? 2 : 3, em: 0.52 }),
        accent && h('div', { display: 'block', ...SERIF, fontSize: size, lineHeight: 1.04, fontStyle: 'italic', color: T4G.pine, lineClamp: 1 }, accent),
        post.text &&
          h(
            'div',
            { display: 'block', marginTop: 20, maxWidth: 760, fontFamily: 'Hanken Grotesk', fontWeight: 500, fontSize: 26, lineHeight: 1.42, color: T4G.soft, lineClamp: 3 },
            excerpt(post.text, 170),
          ),
        facts.length > 0 && tree('div', { display: 'flex', marginTop: 24, textShadow: 'none' }, facts.slice(0, 4).map(fact)),
      ]),
      { color: T4G.cream, textShadow: photo ? '0 2px 16px rgba(10,6,3,0.45)' : 'none', padding: `46px ${PAD}px 46px ${PAD}px` },
    ),
    site,
    T4G.ground,
  );
}

// Road Sign Math (2026-10-31): a sign's photo edge to edge with its math over
// it (Jamie: "the road sign image should be edge-to-edge, the solution (math)
// should be MathJax rendered as an overlay on top of it"), a player's face or
// letter, and Home's map with every pin. The site's own type (Overpass) and
// its dark-mode colours: the sign plate's green, the pins' white ring and
// the green ink words are set in. The math is drawn from the way's LaTeX by
// MathJax, the version the site draws it with (src/math.mjs), and is the
// way's text when its LaTeX can't be drawn.
const RSM = {
  ground: '#101713',
  card: '#18221d',
  land: '#2a3831',
  green: '#006348',
  ink: '#5cc395',
  yellow: '#f2b300',
  dark: '#18201c',
  text: '#e8efeb',
  soft: '#c3cec8',
  shade: (alpha) => `rgba(8,14,11,${alpha})`,
};
const OVERPASS = { fontFamily: 'Overpass', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.01em' };

// The site's logo, √(5 − 1) = 2 on a sign plate, as its layout.tsx draws it.
const RSM_LOGO = (() => {
  const math = mathSvg('\\sqrt{5 - 1} = 2');
  const inner = math.markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replaceAll('currentColor', '#ffffff');
  return svg(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="12" fill="#006348"/>' +
      '<rect x="5.5" y="5.5" width="53" height="53" rx="8.5" fill="none" stroke="#fff" stroke-width="3"/>' +
      `<svg x="11" y="22" width="42" height="20" viewBox="${math.box}">${inner}</svg></svg>`,
  );
})();

/** How a sign card's math is set, for Jamie to choose (npm run render --
 * --rsm=band|plate): 'plate', on the site's green sign plate floating over
 * the photo, the way the site sets a way, or 'band', white over the photo
 * darkened toward its foot. */
export const RSM_SIGN = 'plate';

/** The math's size: em pixels to the em, and no wider or taller than the
 * room it has (a long way steps down to fit). */
export function mathSize(math, { em, width, height }) {
  const tall = (math.units / 1000) * em;
  const k = Math.min(1, width / (tall * math.ratio), height / tall);
  return { width: Math.round(tall * math.ratio * k), height: Math.round(tall * k) };
}

/** A way's math in color at em, or its text when its LaTeX can't be drawn. */
function wayMath(post, color, { em, width, height, shadow = false }) {
  const math = mathImage(post.tex, color, { shadow });
  if (math) return img(math.src, mathSize(math, { em, width, height }));
  const text = post.math || '';
  return h('div', { display: 'block', ...OVERPASS, fontSize: fitSize(Math.min(em * 0.7, 76), text, width, 0.6), color, lineClamp: 2 }, text);
}

/** The words before a Road Sign Math headline: the logo and a line in
 * small capitals. */
const rsmKicker = (text, color) =>
  tree('div', { display: 'flex', alignItems: 'center', fontFamily: 'Overpass', fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', color }, [
    img(RSM_LOGO, { width: 46, height: 46, marginRight: 16, borderRadius: 9 }),
    h('div', { display: 'block', lineClamp: 1, paddingTop: 3 }, (text || 'Road Sign Math').toUpperCase()),
  ]);

/** The sign plate: the site's green with its white inner rule. */
const plate = (child, { pad = '14px 26px', radius = 16, shadow = true } = {}) =>
  h(
    'div',
    { display: 'flex', padding: 5, borderRadius: radius, backgroundColor: RSM.green, boxShadow: shadow ? '0 10px 34px rgba(0,0,0,0.45)' : 'none' },
    h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: pad, borderRadius: radius - 5, border: '3px solid #ffffff', color: WHITE }, child),
  );

/** A fact on a Road Sign Math card: a number in Overpass and a word. */
const rsmFact = ([n, word]) =>
  h(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      marginRight: 12,
      padding: '6px 16px 4px',
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.22)',
      fontFamily: 'Overpass',
      fontSize: 22,
      fontWeight: 700,
      color: RSM.text,
    },
    n !== '' && h('div', { display: 'block', fontWeight: 800, marginRight: 8, color: WHITE }, String(n)),
    h('div', { display: 'block' }, word),
  );

/** Parts in a row with a middle dot between them. Overpass draws U+00B7 with
 * no advance, so in a " · " the dot sits on the space after it and reads
 * "Jamie ·October". The dot here is Inter's, spaced by margin rather than by
 * spaces, which Satori trims at the edge of a text node. A part may be a node,
 * so one can shrink and clip while the others keep their width. */
function dotted(parts, style) {
  const items = parts.filter(Boolean).map((part) => (typeof part === 'string' ? h('div', { display: 'block', flexShrink: 0 }, part) : part));
  const dot = () => h('div', { display: 'block', flexShrink: 0, fontFamily: 'Inter', fontWeight: 600, margin: '0 0.3em' }, '\u00b7');
  return tree('div', { display: 'flex', alignItems: 'baseline', ...style }, items.flatMap((item, i) => (i ? [dot(), item] : [item])));
}

/** Who found a sign and when: "Found by Jamie and Tyler · October 22, 2023".
 * A long list of finders is cut short; the date is not. */
function foundLine(post, style) {
  const finders = post.finders ?? [];
  const who = finders.length < 2 ? (finders[0] ?? '') : `${finders.slice(0, -1).join(', ')} and ${finders.at(-1)}`;
  return dotted([who && h('div', { display: 'block', flexShrink: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, `Found by ${who}`), post.day], style);
}

/** The ways past the first: "+2 more ways". */
const moreWays = (post) => (post.ways > 1 ? `+${post.ways - 1} more ${post.ways === 2 ? 'way' : 'ways'}` : '');

// A sign: its photo fills the card, its top kept (the signs stand high in
// the frame, the road runs under them), darkened at the top for the place
// and at the foot for the math. Unsolved, its numbers stand on small plates
// under "Can you solve it?".
function rsmSign(post, { site, photo, rule }) {
  const variant = rule.rsm ?? RSM_SIGN;
  const width = WIDTH - 2 * PAD;
  const solved = Boolean(post.tex || post.math);
  const foot = variant === 'plate' ? 0.82 : 0.92;
  const backdrop = photo
    ? [
        img(photo.src, { ...FILL, objectFit: 'cover', objectPosition: 'center 20%' }),
        h('div', {
          ...FILL,
          display: 'flex',
          backgroundImage: `linear-gradient(180deg, ${RSM.shade(0.62)} 0%, ${RSM.shade(0.18)} 16%, ${RSM.shade(0)} 26%, ${variant === 'plate' ? `${RSM.shade(0)} 52%, ${RSM.shade(0.4)} 66%` : `${RSM.shade(0.5)} 44%, ${RSM.shade(0.74)} 60%`}, ${RSM.shade(foot)} 100%)`,
        }),
      ]
    : [h('div', { ...FILL, display: 'flex', backgroundImage: `radial-gradient(circle at 85% 20%, rgba(0,99,72,0.55) 0%, rgba(0,99,72,0.15) 40%, rgba(16,23,19,0) 70%)` })];
  const more = moreWays(post);
  const title = h('div', { display: 'block', ...OVERPASS, fontSize: 38, lineClamp: 1, color: WHITE }, post.title);
  const found = foundLine(post, { fontFamily: 'Overpass', fontWeight: 700, fontSize: 24, color: RSM.soft, marginTop: 4 });
  const tiles = tree(
    'div',
    { display: 'flex', alignItems: 'center' },
    (post.numbers ?? []).slice(0, 8).map((n) =>
      h('div', { display: 'flex', marginRight: 14 }, plate(h('div', { display: 'block', ...OVERPASS, fontSize: 52, lineHeight: 1, paddingTop: 6 }, n), { pad: '10px 22px', radius: 14 })),
    ),
  );
  let math;
  if (!solved)
    math = tree('div', { display: 'flex', flexDirection: 'column' }, [
      tiles,
      h('div', { display: 'block', ...OVERPASS, fontSize: 64, marginTop: 22, color: WHITE }, 'Can you solve it?'),
    ]);
  else if (variant === 'plate') math = h('div', { display: 'flex' }, plate(wayMath(post, WHITE, { em: 96, width: width - 70, height: 124 }), { pad: '16px 28px' }));
  else math = wayMath(post, WHITE, { em: 116, width, height: 150, shadow: Boolean(photo) });
  return darkCard(
    backdrop,
    over(
      rsmKicker(post.place, WHITE),
      tree('div', { display: 'flex', flexDirection: 'column', width }, [
        variant !== 'plate' && solved && h('div', { display: 'flex', marginBottom: 14 }, bar(RSM.ink)),
        math,
        tree('div', { display: 'flex', alignItems: 'flex-end', marginTop: solved ? 22 : 18 }, [
          tree('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: 1, minWidth: 0 }, [title, found]),
          more && h('div', { display: 'flex', marginLeft: 20, marginBottom: 2, textShadow: 'none', flexShrink: 0 }, rsmFact(['', more])),
        ]),
      ]),
      { textShadow: photo ? '0 2px 18px rgba(0,0,0,0.5)' : 'none', padding: `40px ${PAD}px 40px ${PAD}px` },
    ),
    site,
    RSM.ground,
  );
}

const AVATAR = 330;

// A player: their profile photo, or their letter in their colour as the site
// draws it, on a white ring, beside their name and what they have found.
function rsmPlayer(post, { site, photo }) {
  const width = WIDTH - 2 * PAD - AVATAR - 72;
  const name = post.title || 'A player';
  const letter = [...(name.trim() || '?')][0].toUpperCase();
  const face = photo
    ? img(photo.src, { width: AVATAR - 16, height: AVATAR - 16, borderRadius: (AVATAR - 16) / 2, objectFit: 'cover' })
    : h(
        'div',
        {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: AVATAR - 16,
          height: AVATAR - 16,
          borderRadius: (AVATAR - 16) / 2,
          backgroundColor: post.color,
          color: post.color.toLowerCase() === RSM.yellow ? RSM.dark : WHITE,
          ...OVERPASS,
          fontSize: 170,
          lineHeight: 1,
          boxSizing: 'border-box',
          paddingTop: 22,
        },
        letter,
      );
  const facts = [
    post.counts?.signs ? [number(post.counts.signs), post.counts.signs === 1 ? 'sign' : 'signs'] : null,
    post.counts?.states ? [number(post.counts.states), post.counts.states === 1 ? 'state' : 'states'] : null,
    post.since ? ['', `since ${post.since}`] : null,
  ].filter(Boolean);
  const size = fitSize(name.length <= 10 ? 104 : name.length <= 18 ? 84 : 64, name, width, 0.6);
  return darkCard(
    [h('div', { ...FILL, display: 'flex', backgroundImage: 'radial-gradient(circle at 18% 50%, rgba(0,99,72,0.55) 0%, rgba(0,99,72,0.16) 32%, rgba(16,23,19,0) 60%)' })],
    tree('div', { ...FILL, display: 'flex', alignItems: 'center', boxSizing: 'border-box', padding: `0 ${PAD}px` }, [
      h(
        'div',
        { display: 'flex', alignItems: 'center', justifyContent: 'center', width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: WHITE, flexShrink: 0, boxShadow: '0 14px 40px rgba(0,0,0,0.45)' },
        face,
      ),
      tree('div', { display: 'flex', flexDirection: 'column', marginLeft: 72, width }, [
        rsmKicker('Road Sign Math player', RSM.ink),
        h('div', { display: 'flex', height: 26 }),
        bar(RSM.ink),
        headline(name, { ...OVERPASS, fontSize: size, lineHeight: 1.04, color: WHITE }, { width, lines: 2, em: 0.6 }),
        facts.length > 0 && tree('div', { display: 'flex', marginTop: 26 }, facts.map(rsmFact)),
      ]),
    ]),
    site,
    RSM.ground,
  );
}

// The map's shapes, from the site's own /us-map.svg: its land and its
// state borders, path data only, drawn here in the card's colours.
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s-]+$/;
export function mapPaths(markup) {
  const d = (name) => {
    const found = new RegExp(`<path class="${name}" d="([^"]+)"`).exec(markup ?? '')?.[1];
    return found && PATH_DATA.test(found) ? found : null;
  };
  const land = d('l');
  return land ? { land, borders: d('b') } : null;
}

const MAP = { width: 975, height: 610 };

// Home: the map of the states with a pin for every sign (the site's pins:
// its green, a white ring, the count on a pin for more than one), and the
// site's name and hero line beside it.
function rsmHome(post, { site, photo }) {
  const paths = mapPaths(photo?.svg);
  const mapWidth = 760;
  const mapHeight = Math.round((mapWidth * MAP.height) / MAP.width);
  const left = WIDTH - mapWidth - 30;
  const top = Math.round((ABOVE - mapHeight) / 2) + 6;
  const map = paths
    ? svg(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP.width} ${MAP.height}"><path fill="${RSM.land}" d="${paths.land}"/>` +
          (paths.borders ? `<path fill="none" stroke="${RSM.ground}" stroke-width="1.4" stroke-linejoin="round" d="${paths.borders}"/>` : '') +
          '</svg>',
      )
    : null;
  const pins = (post.pins ?? []).map(({ x, y, n }) => {
    const size = n > 1 ? 38 : 26;
    return h(
      'div',
      {
        position: 'absolute',
        left: Math.round(left + (x / 100) * mapWidth - size / 2),
        top: Math.round(top + (y / 100) * mapHeight - size / 2),
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        borderRadius: size / 2,
        backgroundColor: RSM.green,
        border: '3px solid #ffffff',
        boxShadow: '0 3px 10px rgba(0,0,0,0.45)',
        fontFamily: 'Overpass',
        fontWeight: 800,
        fontSize: 18,
        paddingTop: 3,
        color: WHITE,
      },
      n > 1 ? String(n) : '',
    );
  });
  const words = post.text || 'Find a sign. Make the math true.';
  const width = left - PAD - 10;
  const counts = [
    post.counts?.signs ? `${number(post.counts.signs)} signs` : '',
    post.counts?.players ? `${number(post.counts.players)} players` : '',
    post.counts?.states ? `${number(post.counts.states)} states` : '',
  ].filter(Boolean);
  return darkCard(
    [
      h('div', { ...FILL, display: 'flex', backgroundImage: 'radial-gradient(circle at 70% 55%, rgba(0,99,72,0.28) 0%, rgba(16,23,19,0) 60%)' }),
      map && img(map, { position: 'absolute', left, top, width: mapWidth, height: mapHeight }),
      ...pins,
    ].filter(Boolean),
    tree('div', { position: 'absolute', top: 0, left: 0, width: left, height: ABOVE, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', padding: `44px 0 44px ${PAD}px` }, [
      h(
        'div',
        { display: 'flex', alignItems: 'center' },
        img(RSM_LOGO, { width: 58, height: 58, marginRight: 16, borderRadius: 11 }),
        h('div', { display: 'block', ...OVERPASS, fontSize: 34, paddingTop: 4 }, post.title || 'Road Sign Math'),
      ),
      tree('div', { display: 'flex', flexDirection: 'column', width }, [
        post.kicker && h('div', { display: 'block', fontFamily: 'Overpass', fontWeight: 700, fontSize: 20, letterSpacing: '0.14em', color: RSM.ink, marginBottom: 14 }, post.kicker.toUpperCase()),
        headline(words, { ...OVERPASS, fontSize: 60, lineHeight: 1.02, color: WHITE }, { width, lines: 4, em: 0.6 }),
        counts.length > 0 && dotted(counts, { marginTop: 22, fontFamily: 'Overpass', fontWeight: 700, fontSize: 24, color: RSM.soft }),
      ]),
    ]),
    site,
    RSM.ground,
  );
}

// The layouts a site's entry names (sites.mjs).
const LAYOUTS = {
  post: postCard,
  issue: (post, { site, photo, meta, rule }) =>
    overCover(post, { site, photo, meta, counts: countParts(post.counts), top: rule.top, mark: W_LOGO, accent: WT.light }),
  episode: episodeCard,
  link: linkCard,
  t4g: t4gCard,
  rsm: (post, args) => (post.kind === 'player' ? rsmPlayer(post, args) : rsmSign(post, args)),
  rsmHome,
};

/** The element tree for a post's card. photo is fetchPhoto's result or null;
 * overlay changes OVERLAY (and rsm, RSM_SIGN), for a preview of another
 * answer (npm run render --overlay=...), never on the Lambda. */
export function cardFor(post, { site, photo, kicker: number, overlay }) {
  if (post.home) return (site.homeLayout ? LAYOUTS[site.homeLayout] : homeCard)(post, { site, photo });
  const layout = LAYOUTS[site.layout];
  if (!layout) throw new Error(`${site.id} names no layout here (${site.layout})`);
  // An early issue titled only with its date ("May 5, 2018") isn't dated twice.
  const date = formatDate(post.published);
  const meta = [number, date === post.title ? '' : date, ...post.categories.slice(0, 3)].filter(Boolean).join(' · ');
  return layout(post, { site, photo, meta, rule: { ...OVERLAY, ...overlay } });
}
