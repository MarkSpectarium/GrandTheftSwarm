/**
 * Bundle the API for Vercel serverless deployment
 * This creates a single bundled file that doesn't rely on symlinks
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

await build({
  entryPoints: [join(rootDir, 'packages/api/dist/packages/api/src/index.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: join(rootDir, 'api/bundled.js'),
  external: [
    // Keep native modules external
    '@libsql/client',
  ],
  banner: {
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`,
  },
});

console.log('API bundled successfully to api/bundled.js');
