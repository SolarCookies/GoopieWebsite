const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

initializeApp();

// SPA shell is copied here during the build step (scripts/prepare-functions.mjs)
const SPA_SHELL_PATH = path.join(__dirname, 'spa-shell.html');
let _spaShell = null;
function getSpaShell() {
  if (!_spaShell) {
    _spaShell = fs.existsSync(SPA_SHELL_PATH)
      ? fs.readFileSync(SPA_SHELL_PATH, 'utf8')
      : '<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><div id="root"></div></body></html>';
  }
  return _spaShell;
}

const BOT_UA_PATTERNS = [
  'discordbot',
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'slack-imgproxy',
  'whatsapp',
  'telegrambot',
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'embedly',
  'iframely',
  'applebot',
  'rogerbot',
  'semrushbot',
  'preview',
];

function isBot(ua) {
  const lower = (ua || '').toLowerCase();
  return BOT_UA_PATTERNS.some(p => lower.includes(p));
}

/** Escape a value for use inside an HTML attribute (double-quoted). */
function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Pick the best OG image from a game object. Prefers a wide headerImage. */
function pickOgImage(game) {
  if (game.headerImage) {
    return Array.isArray(game.headerImage) ? game.headerImage[0] : game.headerImage;
  }
  return game.coverImage || 'https://x02.me/i/G6QA.png';
}

const SITE_DEFAULTS = {
  title: 'Goopie',
  description:
    'Browse and play recompiled Xbox 360 games on modern hardware. Community-driven launcher and library.',
  image: 'https://x02.me/i/G6QA.png',
  url: 'https://goopie.xyz/',
};

function buildOgHtml({ title, description, image, url, redirectPath }) {
  const t = esc(title);
  const d = esc(description.length > 300 ? description.slice(0, 297) + '…' : description);
  const img = esc(image);
  const u = esc(url);
  const redir = JSON.stringify(redirectPath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${t}</title>
  <meta name="description" content="${d}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${u}" />
  <meta property="og:site_name" content="Goopie" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />
</head>
<body>
  <p>Loading&#8230; <a href="${u}">${t}</a></p>
  <script>window.location.replace(${redir});</script>
</body>
</html>`;
}

exports.ogProxy = onRequest({ region: 'us-central1' }, async (req, res) => {
  const ua = req.headers['user-agent'] ?? '';
  const reqPath = req.path; // e.g. /library/reblue

  // ── Non-bot users: serve the SPA shell so the app boots normally ──────────
  if (!isBot(ua)) {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(getSpaShell());
    return;
  }

  // ── Bot traffic: return tailored OG tags ──────────────────────────────────
  const libraryMatch = reqPath.match(/^\/library\/([^/]+)$/);

  if (libraryMatch) {
    const recompName = decodeURIComponent(libraryMatch[1]);
    try {
      const db = getFirestore();
      const snapshot = await db
        .collection('games')
        .where('recompName', '==', recompName)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const game = snapshot.docs[0].data();
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(
          buildOgHtml({
            title: `${game.title} | Goopie`,
            description: game.description || `Play ${game.title} on modern hardware via Goopie.`,
            image: pickOgImage(game),
            url: `https://goopie.xyz${reqPath}`,
            redirectPath: reqPath,
          }),
        );
        return;
      }
    } catch (err) {
      console.error('Firestore lookup failed:', err);
      // Fall through to generic OG response below
    }
  }

  // ── Generic fallback OG for unknown paths ─────────────────────────────────
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(
    buildOgHtml({
      ...SITE_DEFAULTS,
      redirectPath: reqPath,
    }),
  );
});
