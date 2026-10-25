import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardFor } from '../src/card.mjs';
import { OWNER, SITES, siteAt } from '../src/sites.mjs';

test('each site takes its origin and label from shared/sites.json', () => {
  assert.deepEqual(
    Object.values(SITES).map((site) => [site.id, site.origin, site.label, site.host]),
    [
      ['www', 'https://www.thingelstad.com', 'Blog', 'thingelstad.com'],
      ['weekly', 'https://weekly.thingelstad.com', 'Newsletter', 'weekly.thingelstad.com'],
      ['another', 'https://another.thingelstad.com', 'Podcast', 'another.thingelstad.com'],
    ],
  );
  assert.equal(OWNER, 'Jamie Thingelstad');
  assert.equal(siteAt('https://weekly.thingelstad.com/archive/353/'), SITES.weekly);
  assert.equal(siteAt('https://thingelstad.xyz/things/thingy/'), null);
});

test('every site names a layout that draws', () => {
  const post = { title: 'A title', text: '', published: null, categories: [], counts: { links: 0, journal: 0 }, episode: { number: 0, seconds: 0 } };
  for (const site of Object.values(SITES)) assert.equal(cardFor(post, { site, photo: null }).props.style.width, 1200, site.id);
  assert.throws(() => cardFor(post, { site: { ...SITES.www, layout: 'none' }, photo: null }), /names no layout/);
});
