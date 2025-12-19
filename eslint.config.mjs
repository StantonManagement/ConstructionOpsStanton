import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const nextPlugin = require('@next/eslint-plugin-next');
const tsParser = require('@typescript-eslint/parser');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const globals = require('globals');

const nextCoreWebVitalsRules =
  (nextPlugin?.configs && (nextPlugin.configs['core-web-vitals'] || nextPlugin.configs['core-web-vitals-legacy'])?.rules) ||
  {};

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/*.d.ts',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...nextCoreWebVitalsRules,
      ...(reactHooksPlugin?.configs?.recommended?.rules || {}),

      // Pragmatic mode: keep lint usable while we refactor to stricter standards.
      // These rules are valuable but currently block the codebase.
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/static-components': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
    },
  },
];
