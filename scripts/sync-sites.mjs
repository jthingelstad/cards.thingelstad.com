// Vendors the canonical list of Jamie's sites (thingelstad.com
// shared/sites.json) into src/shared/sites.json, where src/sites.mjs reads
// each site's origin and strip label, and the owner's name for the band.
// Mirrors weekly.thingelstad.com's scripts/sync-sites.mjs:
//
//   npm run sites:sync    copy from the sibling shared/sites.json
//   npm run sites:check   fail if the vendored copy is stale
//
// SITES_SOURCE overrides the source path (relative to this repo's root); the
// default is ../shared/sites.json, relative on purpose because the
// thingelstad.com repos move as a unit (a worktree elsewhere needs
// SITES_SOURCE). CI checks out only this repo, so the vendored copy is
// committed and the check runs locally (npm test), never in CI.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targetPath = resolve(repoRoot, 'src/shared/sites.json');

async function syncSites({ check = false } = {}) {
  const source = resolve(repoRoot, process.env.SITES_SOURCE || '../shared/sites.json');
  const content = await readFile(source, 'utf8');
  const data = JSON.parse(content);
  if (!Array.isArray(data.sites) || data.sites.length === 0) throw new Error(`${source} has no sites list.`);
  if (check) {
    const current = await readFile(targetPath, 'utf8').catch(() => '');
    if (current !== content) throw new Error('Vendored sites.json is stale. Run npm run sites:sync.');
    process.stdout.write(`sites.json matches ${source}.\n`);
    return;
  }
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content);
  process.stdout.write(`Synced ${data.sites.length} sites from ${source}.\n`);
}

syncSites({ check: process.argv.includes('--check') }).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
