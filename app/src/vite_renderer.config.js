import { defineConfig } from 'vite';
import { escapeRegExp } from 'lodash';
import reactRefresh from '@vitejs/plugin-react-refresh';
import { builtinModules } from 'module';
import pkg from '../package.json';
import commonjsExternals from 'vite-plugin-commonjs-externals';

const commonjsPackages = [
  'electron',
  'electron/main',
  'electron/common',
  'electron/renderer',
  'original-fs',
  ...builtinModules,
  ...Object.keys(pkg.dependencies).map(
    (name) => new RegExp('^' + escapeRegExp(name) + '(\\/.+)?$')
  ),
];

export default defineConfig({
  root: __dirname,
  base: '',
  plugins: [reactRefresh(), commonjsExternals({ externals: commonjsPackages })],
  build: {
    outDir: '../build/renderer_process/',
    emptyOutDir: true,
    minify: false,
    brotliSize: false,
  },
});
