// Local dev server: watches client/src, rebuilds, serves on :5173.
// Usage: node client/scripts/dev.mjs   (or: npm run dev:client)
import { context } from 'esbuild';
import { cpSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = join(root, 'dev-dist');
mkdirSync(outdir, { recursive: true });

const cssInject = {
  name: 'css-inject',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => {
      if (args.kind === 'import-statement') {
        return { path: join(args.resolveDir, args.path), namespace: 'css-inject' };
      }
      return null;
    });
    build.onLoad({ filter: /.*/, namespace: 'css-inject' }, async (args) => {
      const { readFile } = await import('node:fs/promises');
      const css = await readFile(args.path, 'utf8');
      return {
        contents:
          `const css=${JSON.stringify(css)};` +
          `const el=document.createElement('style');el.textContent=css;document.head.appendChild(el);`,
        loader: 'js',
      };
    });
  },
};

const ctx = await context({
  entryPoints: [join(root, 'src/main.tsx')],
  bundle: true,
  outdir,
  splitting: true,
  format: 'esm',
  target: ['es2022'],
  loader: { '.json': 'json' },
  plugins: [cssInject],
  define: { 'process.env.NODE_ENV': '"development"', __PROD__: 'false' },
  logLevel: 'info',
});

// Dev HTML: same as public/index.html but pointing at the dev bundle.
const html = readFileSync(join(root, 'public', 'index.html'), 'utf8').replace(
  './main.tsx',
  './main.js',
);
writeFileSync(join(outdir, 'index.html'), html);
for (const f of ['manifest.json', 'icon.svg']) {
  cpSync(join(root, 'public', f), join(outdir, f));
}

await ctx.watch();
const { port } = await ctx.serve({ servedir: outdir, port: 5173 });
console.log(`dev server on http://localhost:${port}`);
