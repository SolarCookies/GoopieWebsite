/**
 * Copies dist/index.html → functions/spa-shell.html after the Vite build.
 * The Cloud Function reads this file to serve the SPA shell to non-bot users
 * who hit /library/* routes (which are routed through the function).
 */
import { copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const src = resolve(root, 'dist', 'index.html');
const dest = resolve(root, 'functions', 'spa-shell.html');

if (!existsSync(src)) {
  console.error('ERROR: dist/index.html not found – run `vite build` first.');
  process.exit(1);
}

copyFileSync(src, dest);
console.log('✓ Copied dist/index.html → functions/spa-shell.html');
