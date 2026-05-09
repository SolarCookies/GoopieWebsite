/**
 * Generates a static dist/library/<recompName>/index.html for every public game.
 * Each file is the SPA shell with game-specific Open Graph meta tags injected,
 * so bots (Discord, Twitter, etc.) see the right title + banner image.
 *
 * Apache's .htaccess only falls back to /index.html when no real file exists,
 * so these static files are served directly and the SPA boots normally for
 * regular browser visits.
 *
 * Run after `vite build`. Requires VITE_FIREBASE_API_KEY and
 * VITE_FIREBASE_PROJECT_ID to be set.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const API_KEY    = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error(
    'ERROR: VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID not set – cannot generate OG pages.',
  );
  process.exit(1);
}

const distIndex = resolve(root, 'dist', 'index.html');
if (!existsSync(distIndex)) {
  console.error('ERROR: dist/index.html not found – run `vite build` first.');
  process.exit(1);
}

const spaShell = readFileSync(distIndex, 'utf8');

// ── Firestore REST helpers ────────────────────────────────────────────────────

function parseValue(val) {
  if (!val) return undefined;
  if ('stringValue'  in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue'  in val) return val.doubleValue;
  if ('nullValue'    in val) return null;
  if ('arrayValue'   in val) return (val.arrayValue.values || []).map(parseValue);
  if ('mapValue'     in val) return parseFields(val.mapValue.fields || {});
  return undefined;
}

function parseFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = parseValue(v);
  return out;
}

async function fetchAllGames() {
  const games = [];
  let nextPageToken;
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/games`;

  do {
    const url = new URL(base);
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('pageSize', '300');
    if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
    const json = await res.json();

    for (const doc of json.documents || []) {
      const game = parseFields(doc.fields || {});
      game.id = doc.name.split('/').pop();
      games.push(game);
    }
    nextPageToken = json.nextPageToken;
  } while (nextPageToken);

  return games;
}

// ── HTML helpers ─────────────────────────────────────────────────────────────

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function pickImage(game) {
  const h = game.headerImage;
  if (h) return Array.isArray(h) ? h[0] : h;
  return game.coverImage || 'https://x02.me/i/G6QA.png';
}

function buildOgBlock({ title, description, image, url }) {
  const d = description.length > 300 ? description.slice(0, 297) + '\u2026' : description;
  return `    <!-- Game-specific Open Graph tags -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:site_name" content="Goopie" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(d)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(d)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <meta name="description" content="${esc(d)}" />`;
}

function buildGameHtml(game) {
  const title       = `${game.title} | Goopie`;
  const description = game.description
    ? game.description.replace(/\s+/g, ' ').trim()
    : `Play ${game.title} on modern hardware via Goopie.`;
  const image = pickImage(game);
  const url   = `https://goopie.xyz/library/${encodeURIComponent(game.recompName)}`;

  // Replace <title>
  let html = spaShell.replace(
    /<title>[^<]*<\/title>/,
    `<title>${esc(title)}</title>`,
  );

  // Replace the default OG block (identified by the comment we added) up to </head>
  const marker   = '<!-- Default Open Graph';
  const markerIdx = html.indexOf(marker);

  if (markerIdx !== -1) {
    const headClose = html.indexOf('</head>', markerIdx);
    html =
      html.slice(0, markerIdx) +
      buildOgBlock({ title, description, image, url }) +
      '\n  ' +
      html.slice(headClose);
  } else {
    // Fallback: inject before </head>
    html = html.replace('</head>', buildOgBlock({ title, description, image, url }) + '\n  </head>');
  }

  return html;
}

// ── Main ─────────────────────────────────────────────────────────────────────

let games;
try {
  games = await fetchAllGames();
} catch (err) {
  console.error('ERROR: Failed to fetch games from Firestore:', err);
  process.exit(1);
}
console.log(`Fetched ${games.length} games from Firestore.`);

let count = 0;
for (const game of games) {
  if (!game.recompName || game.isPublic === false) continue;

  const dir = resolve(root, 'dist', 'library', game.recompName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), buildGameHtml(game), 'utf8');
  count++;
  console.log(`  ✓ /library/${game.recompName}  →  ${game.title}`);
}

console.log(`\nGenerated ${count} OG pages in dist/library/`);
