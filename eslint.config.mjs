import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
  {
    ignores: [
      'bin/',
      '.history/',
      '**/*.min.js',
      '**/*-min.js',
      '**/*.bundle.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
