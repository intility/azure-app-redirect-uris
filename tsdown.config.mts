import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { cli: 'main.ts' },
  outDir: 'bin',
  format: 'cjs',
  platform: 'node',
  // Keep the `bin/cli.js` path that package.json points at.
  fixedExtension: false,
});
