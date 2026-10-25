// The card's layout, 1200 x 630, as the element tree Satori draws.
//
// Words first, in the blog's type: Inter Tight 800 for a title, Inter for
// everything else. Over the words, the date and categories; under them, a
// band in the sites strip's grey that reads like the strip (Jamie
// Thingelstad, then the site's label) with the host on the right. A titled
// post shows its title and the start of its text; a micropost shows its own
// words, smaller and lighter the longer they run; a post with a photo gives
// the photo the right half. Black and white, as the blog is.
//
// Decided with Jamie, 2026-10-24: the full canvas, no photo of Jamie, and
// photo posts get this card too. Weekly Thing issues and Another Thing
// episodes got the same card on 2026-10-25 (Jamie: "Weekly Thing and Another
// Thing issues should get custom share images with cards.thingelstad.com
// solution."): the issue number before the date (WT353) and the site's
// label in its sites-strip colour, its one mark. An issue with a cover is
// drawn over it (Jamie: "text overlaid on the issue image with the
// subtitle/dek included. Counts of links and journal entries"): the cover
// fills the card, darkened toward the words; one without keeps this card,
// with its dek and counts under the title.
//
// Then richer (Jamie, 2026-10-25: "make it rich and inviting and equal to the
// quality of the thing it is previewing"): an issue with no cover is drawn on
// the newsletter's blue under a large W, its logo mark; an episode on the
// show's own slate with its three dots, its number, its running time and a
// listen button; and the newsletter's front page has a card of its own, the
// hero line over the newest cover, which every page there but an issue or a
// topic shares.

export const WIDTH = 1200;
export const HEIGHT = 630;

const INK = '#16161a';
const SOFT = '#3d3d47';
const MUTED = '#5a5a66';
const STRIP = '#f3f3f5';

const h = (type, style, ...children) => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

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

// The words' column: the left half beside a photo, else the whole card, less
// 64px either side.
const PAD = 64;
const column = (photo) => (photo ? WIDTH / 2 : WIDTH);

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

function noteStyle(n, photo) {
  if (n <= 40) return { fontSize: photo ? 56 : 76, fontFamily: 'Inter Tight', fontWeight: 700, lines: 4 };
  if (n <= 90) return { fontSize: photo ? 50 : 60, fontFamily: 'Inter Tight', fontWeight: 700, lines: 5 };
  if (n <= 150) return { fontSize: photo ? 38 : 46, fontFamily: 'Inter', fontWeight: 500, lines: photo ? 7 : 6 };
  return { fontSize: photo ? 32 : 38, fontFamily: 'Inter', fontWeight: 500, lines: photo ? 8 : 7 };
}

/** "19 links · 4 journal entries", leaving out what an issue has none of. */
export function countsLine(counts) {
  const part = (n, one, many) => (n > 0 ? `${n} ${n === 1 ? one : many}` : '');
  return [part(counts?.links, 'link', 'links'), part(counts?.journal, 'journal entry', 'journal entries')]
    .filter(Boolean)
    .join(' · ');
}

const BAND = 68;
const WHITE = '#ffffff';

// The newsletter's blues: its logo circle and strip mark, a deep end for the
// gradient, and the light and pale tints that read on them.
const WT = { circle: '#1f6fd6', blue: '#1a5eb6', deep: '#0d356e', light: '#8fbcf5', pale: '#d6e6fb' };
// The show's artwork: slate, grey dots and the site's crimson.
const AT = { slate: '#34495e', high: '#3f5872', deep: '#1f2d3b', dot: '#7c8a99', crimson: '#c8174a', pale: '#d7dee6' };

const svg = (markup) => `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`;
// The W of the newsletter's logo (its favicon's path), cropped to the letter.
const W_PATH =
  'M8.61 10.6 6 10.45 6.27 9.14H12.47L12.19 10.45L9.73 10.6ZM8.5 22.86 7.19 9.14H10.67L11.23 20.5H11.17L11.99 17.71L15.66 9.14H18.18L19.22 20.5H19.18L19.89 17.71L23.41 9.14H24.94L19.06 22.86H16.45L15.36 12.04H15.64L14.84 14.52L11.15 22.86ZM16.14 10.6 13.63 10.45 13.9 9.14H20.14L19.87 10.45L17.37 10.6ZM23.14 10.6 21.39 10.45 21.66 9.14H26L25.73 10.45L23.89 10.6Z';
const W_BIG = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="5.5 8.6 21 14.8"><path fill="#ffffff" fill-opacity="0.09" d="${W_PATH}"/></svg>`);
const W_LOGO = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${WT.circle}"/><path fill="#ffffff" d="${W_PATH}"/></svg>`);
const PLAY = svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M8 5.5v13l10.5-6.5z"/></svg>');

const img = (src, style) => ({ type: 'img', props: { src, style } });

/** "11 min", "1 hr 5 min": an episode's running time, as its page says it. */
export function durationLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  return `${minutes} min`;
}

const number = (n) => new Intl.NumberFormat('en-US').format(n);

// The owner's name, the site's label and its host, in the strip's grey.
const band = (site) =>
  h(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      height: BAND,
      flexShrink: 0,
      padding: '0 64px',
      backgroundColor: STRIP,
      fontSize: 22,
    },
    h('div', { display: 'block', color: MUTED }, site.owner),
    h('div', { display: 'block', marginLeft: 28, fontWeight: 600, color: site.mark ?? INK }, site.label),
    h('div', { display: 'block', marginLeft: 'auto', fontWeight: 500, color: MUTED }, site.host),
  );

const tree = (type, style, children) => ({ type, props: { style, children: children.filter(Boolean) } });

const ABOVE = HEIGHT - BAND;
const FILL = { position: 'absolute', top: 0, left: 0, width: WIDTH, height: ABOVE };

// A dark card: the backdrop layers fill the space above the band, the words
// sit over them in white, and the band closes it as on every card.
const darkCard = (backdrop, words, site) =>
  h(
    'div',
    { display: 'flex', flexDirection: 'column', width: WIDTH, height: HEIGHT, backgroundColor: INK, fontFamily: 'Inter' },
    tree('div', { display: 'flex', position: 'relative', width: WIDTH, height: ABOVE, flexShrink: 0, overflow: 'hidden' }, [
      ...backdrop,
      words,
    ]),
    band(site),
  );

// An issue over its cover: the photo fills the card above the band, darkened
// at the top for the kicker and toward the bottom for the words. With no
// cover, the newsletter's blue under its W.
function overCover(post, { site, photo, meta, counts }) {
  const width = WIDTH - 2 * PAD;
  const n = post.title.length;
  const size = fitSize(n <= 28 ? 88 : n <= 56 ? 72 : 60, post.title, width, 0.64);
  const shadow = photo ? '0 2px 18px rgba(0, 0, 0, 0.45)' : '0 2px 12px rgba(4, 20, 50, 0.35)';
  const backdrop = photo
    ? [
        img(photo.src, { ...FILL, objectFit: 'cover', objectPosition: 'center' }),
        h('div', {
          ...FILL,
          display: 'flex',
          backgroundImage:
            'linear-gradient(180deg, rgba(10,10,14,0.6) 0%, rgba(10,10,14,0) 28%, rgba(10,10,14,0.2) 45%, rgba(10,10,14,0.9) 100%)',
        }),
      ]
    : [
        h('div', { ...FILL, display: 'flex', backgroundImage: `linear-gradient(135deg, ${WT.circle} 0%, ${WT.blue} 38%, ${WT.deep} 100%)` }),
        img(W_BIG, { position: 'absolute', top: 36, left: 560, width: 680, height: 479 }),
      ];
  return darkCard(
    backdrop,
    tree('div', { ...FILL, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', padding: `46px ${PAD}px 40px ${PAD}px`, color: WHITE, textShadow: shadow }, [
        h('div', { display: 'block', fontSize: 24, fontWeight: 700, letterSpacing: '0.04em', color: photo ? WHITE : WT.pale }, meta || ' '),
        tree('div', { display: 'flex', flexDirection: 'column', width }, [
          h(
            'div',
            {
              display: 'block',
              fontFamily: 'Inter Tight',
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              // Not 'balance': with a clamp, Satori balances for one line
              // more than it keeps and cuts the title at half the width.
              lineClamp: 2,
            },
            post.title,
          ),
          post.text &&
            h(
              'div',
              { display: 'block', marginTop: 20, fontSize: 27, lineHeight: 1.4, fontWeight: 500, lineClamp: 2 },
              excerpt(post.text, 170),
            ),
          counts && h('div', { display: 'block', marginTop: 18, fontSize: 22, fontWeight: 700, letterSpacing: '0.02em' }, counts),
        ]),
      ]),
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
          h('div', { display: 'block', marginBottom: 14, fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', color: WT.pale }, post.kicker.toUpperCase()),
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

// An episode on the show's slate: its three dots and name, the episode's
// number, date and running time, its title and summary, and a listen button.
function episodeCard(post, { site }) {
  const width = WIDTH - 2 * PAD;
  const n = post.title.length;
  const size = fitSize(n <= 26 ? 88 : n <= 52 ? 72 : 60, post.title, width, 0.64);
  const { number: no, seconds } = post.episode ?? {};
  const meta = [no ? `Episode ${no}` : '', formatDate(post.published)].filter(Boolean).join(' · ');
  return darkCard(
    [
      h('div', { ...FILL, display: 'flex', backgroundImage: `linear-gradient(135deg, ${AT.high} 0%, ${AT.slate} 45%, ${AT.deep} 100%)` }),
      // The dots again, large, faint but for the crimson one, at the right.
      tree('div', { position: 'absolute', top: 70, left: 700, display: 'flex' }, [
        dot('rgba(255,255,255,0.08)', 104),
        dot('rgba(255,255,255,0.08)', 104),
        dot('rgba(200,23,74,0.5)', 104),
      ]),
    ],
    tree('div', { ...FILL, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', padding: `46px ${PAD}px 40px ${PAD}px`, color: WHITE }, [
      h(
        'div',
        { display: 'flex', alignItems: 'center' },
        dot(AT.dot, 18),
        dot(AT.dot, 18),
        dot(AT.crimson, 18),
        h('div', { display: 'block', marginLeft: 6, fontFamily: 'Inter Tight', fontWeight: 800, fontSize: 30, letterSpacing: '-0.01em' }, 'Another Thing'),
      ),
      tree('div', { display: 'flex', flexDirection: 'column', width }, [
        meta && h('div', { display: 'block', marginBottom: 14, fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', color: AT.pale }, meta.toUpperCase()),
        h(
          'div',
          { display: 'block', fontFamily: 'Inter Tight', fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: '-0.025em', lineClamp: 2 },
          post.title,
        ),
        post.text &&
          h('div', { display: 'block', marginTop: 18, fontSize: 28, lineHeight: 1.4, fontWeight: 500, color: AT.pale, lineClamp: 2 }, excerpt(post.text, 170)),
        h(
          'div',
          { display: 'flex', alignItems: 'center', marginTop: 26 },
          h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: AT.crimson }, img(PLAY, { width: 30, height: 30, marginLeft: 3 })),
          h('div', { display: 'block', marginLeft: 16, fontSize: 26, fontWeight: 700 }, seconds ? `Listen · ${durationLabel(seconds)}` : 'Listen'),
        ),
      ]),
    ]),
    site,
  );
}

// A blog post: its words, and its photo on the right half when it has one.
function postCard(post, { site, photo, meta }) {
  const hasPhoto = Boolean(photo);
  const width = column(hasPhoto) - 2 * PAD;
  const words = [];

  if (post.title) {
    const size = fitSize(titleSize(post.title.length, hasPhoto), post.title, width, 0.64);
    words.push(
      h(
        'div',
        {
          display: 'block',
          fontFamily: 'Inter Tight',
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: '-0.025em',
          color: INK,
          textWrap: 'balance',
          lineClamp: hasPhoto ? 5 : 3,
        },
        post.title,
      ),
    );
    if (!hasPhoto && post.text)
      words.push(
        h(
          'div',
          {
            display: 'block',
            marginTop: 28,
            fontSize: 28,
            lineHeight: 1.5,
            color: SOFT,
            maxWidth: 1000,
            lineClamp: 2,
          },
          excerpt(post.text, 220),
        ),
      );
  } else if (post.text) {
    const text = excerpt(post.text, hasPhoto ? 200 : 260);
    const { lines, ...style } = noteStyle(text.length, hasPhoto);
    style.fontSize = fitSize(style.fontSize, text, width, style.fontFamily === 'Inter' ? 0.62 : 0.64);
    words.push(
      h(
        'div',
        {
          display: 'block',
          ...style,
          lineHeight: style.fontFamily === 'Inter' ? 1.3 : 1.15,
          letterSpacing: style.fontFamily === 'Inter' ? '-0.01em' : '-0.015em',
          color: INK,
          textWrap: 'pretty',
          lineClamp: lines,
        },
        text,
      ),
    );
  }

  const side = h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flexShrink: 0,
      boxSizing: 'border-box',
      width: column(hasPhoto),
      padding: `52px ${PAD}px 40px ${PAD}px`,
    },
    h(
      'div',
      { display: 'block', fontSize: 22, fontWeight: 600, letterSpacing: '0.04em', color: MUTED, lineClamp: 2 },
      meta || ' ',
    ),
    h('div', { display: 'flex', flexDirection: 'column', width }, ...words),
  );

  const main = [side];
  if (hasPhoto)
    main.push(
      h(
        'div',
        {
          display: 'flex',
          flexGrow: 1,
          backgroundColor: photo.screenshot ? STRIP : INK,
          padding: photo.screenshot ? 28 : 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
        {
          type: 'img',
          props: {
            src: photo.src,
            style: {
              width: '100%',
              height: '100%',
              objectFit: photo.screenshot ? 'contain' : 'cover',
              objectPosition: 'center',
            },
          },
        },
      ),
    );

  return h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: '#ffffff',
      fontFamily: 'Inter',
      color: INK,
    },
    h('div', { display: 'flex', flexGrow: 1, minHeight: 0 }, ...main),
    band(site),
  );
}

// The layouts a site's entry names (sites.mjs).
const LAYOUTS = {
  post: postCard,
  issue: (post, { site, photo, meta }) => overCover(post, { site, photo, meta, counts: countsLine(post.counts) }),
  episode: episodeCard,
};

/** The element tree for a post's card. photo is fetchPhoto's result or null. */
export function cardFor(post, { site, photo, kicker }) {
  if (post.home) return homeCard(post, { site, photo });
  const layout = LAYOUTS[site.layout];
  if (!layout) throw new Error(`${site.id} names no layout here (${site.layout})`);
  // An early issue titled only with its date ("May 5, 2018") isn't dated twice.
  const date = formatDate(post.published);
  const meta = [kicker, date === post.title ? '' : date, ...post.categories.slice(0, 3)].filter(Boolean).join(' · ');
  return layout(post, { site, photo, meta });
}
