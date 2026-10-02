// esbuild production build for the client.
// Output: client/dist/ (served by the server). Game modules are code-split
// via dynamic import() in games/registry.ts so the lobby loads fast.
import { build } from 'esbuild';
import { cpSync, mkdirSync, existsSync, readFile } from 'node:fs';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = join(root, 'dist');
mkdirSync(outdir, { recursive: true });

// Inline imported CSS into the JS bundle via a <style> tag.
// Keeps deploys to a single static dir with no <link> bookkeeping.
const cssInject = {
  name: 'css-inject',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => {
      if (args.kind === 'import-statement') {
        return { path: resolve(args.resolveDir, args.path), namespace: 'css-inject' };
      }
      return null;
    });
    build.onLoad({ filter: /.*/, namespace: 'css-inject' }, async (args) => {
      const css = await new Promise((res, rej) =>
        readFile(args.path, 'utf8', (e, d) => (e ? rej(e) : res(d))),
      );
      const js =
        `const css=${JSON.stringify(css)};` +
        `const el=document.createElement('style');` +
        `el.textContent=css;document.head.appendChild(el);` +
        `export default css;`;
      return { contents: js, loader: 'js', resolveDir: dirname(args.path) };
    });
  },
};

const result = await build({
  entryPoints: [join(root, 'src/main.tsx')],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['es2022'],
  outdir,
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  entryNames: '[name]-[hash]',
  loader: { '.json': 'json' },
  plugins: [cssInject],
  define: { 'process.env.NODE_ENV': '"production"', __PROD__: 'true' },
  metafile: true,
  logLevel: 'info',
});

// Static assets -> dist. index.html's dev entry (./main.tsx) is rewritten to
// the hashed production bundle so the page actually boots.
const mainJs = readdirSync(outdir).find((f) => /^main-[A-Z0-9]+\.js$/.test(f));
if (!mainJs) throw new Error('production bundle not found in ' + outdir);
const html = readFileSync(join(root, 'public', 'index.html'), 'utf8').replace(
  './main.tsx',
  `./${mainJs}`,
);
writeFileSync(join(outdir, 'index.html'), html);
for (const f of ['manifest.json', 'sw.js', 'icon.svg']) {
  const src = join(root, 'public', f);
  if (existsSync(src)) cpSync(src, join(outdir, f));
}
console.log('client build done ->', outdir);
