import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedSites, pathFor, unzip } from '../tools/compare.mjs';
import { zip } from '../tools/package.mjs';

test('a package unzips to what was zipped', () => {
  const entries = [
    { name: 'index.mjs', data: Buffer.from('export const handler = () => {};\n') },
    { name: 'fonts/a.woff', data: Buffer.alloc(5000, 7) },
    { name: 'empty', data: Buffer.alloc(0) },
  ];
  const back = unzip(zip(entries));
  assert.deepEqual(
    back.map(({ name, data }) => [name, data.toString('hex')]),
    entries.map(({ name, data }) => [name, data.toString('hex')]).sort(),
  );
  assert.throws(() => unzip(Buffer.alloc(30)), /not a zip/);
});

test('a sample is compared at its card path', () => {
  assert.equal(pathFor('https://www.thingelstad.com/2026/10/24/red-leaves.html'), '/www/2026/10/24/red-leaves.png');
  assert.equal(pathFor('https://weekly.thingelstad.com/archive/353/'), '/weekly/archive/353.png');
  assert.equal(pathFor('https://weekly.thingelstad.com/'), '/weekly/index.png');
});

// A handler that answers like the Lambda: a 302 to the named v, then the card.
const handler = (cards) => async ({ rawPath, rawQueryString }) => {
  if (!rawQueryString) return { statusCode: 302, headers: { location: `${rawPath}?v=abc` } };
  if (!(rawPath in cards)) return { statusCode: 502, headers: {}, body: '' };
  return { statusCode: 200, headers: { 'content-type': 'image/png' }, body: cards[rawPath] };
};

test('only the sites whose samples draw differently are cleared', async () => {
  const samples = ['https://www.thingelstad.com/2026/10/24/red-leaves.html', 'https://weekly.thingelstad.com/archive/353/'];
  const before = handler({ '/www/2026/10/24/red-leaves.png': 'A', '/weekly/archive/353.png': 'B' });
  const same = handler({ '/www/2026/10/24/red-leaves.png': 'A', '/weekly/archive/353.png': 'B' });
  const changed = handler({ '/www/2026/10/24/red-leaves.png': 'A', '/weekly/archive/353.png': 'C' });
  assert.deepEqual([...(await changedSites(before, same, samples, ['www', 'weekly'])).keys()], []);
  assert.deepEqual([...(await changedSites(before, changed, samples, ['www', 'weekly'])).keys()], ['weekly']);
  // A site with no sample, and a sample that fails to draw, are cleared.
  const broken = handler({ '/weekly/archive/353.png': 'B' });
  assert.deepEqual([...(await changedSites(before, broken, samples, ['www', 'weekly', 'links'])).keys()], ['www', 'links']);
});
