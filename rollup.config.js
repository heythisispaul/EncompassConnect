import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjsPlugin from '@rollup/plugin-commonjs';
import typescriptPlugin from '@rollup/plugin-typescript';
import { main, module } from './package.json';

const rollUpConfig = {
  input: 'src/index.ts',
  output: [
    {
      file: main,
      format: 'cjs',
      exports: 'auto',
      sourcemap: true,
    },
    {
      file: module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
  ],
  external: [
    'http',
    'https',
    'url',
    'stream',
    'zlib',
  ],
  plugins: [
    typescriptPlugin(),
    nodeResolve(),
    commonjsPlugin(),
  ],
};

export default rollUpConfig;
