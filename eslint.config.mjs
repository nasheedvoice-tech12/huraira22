// @ts-check
// Velcora ESLint flat config (ESLint 9).
// NOTE: this project's authoritative "lint" is `tsc --noEmit` (npm run lint).
// ESLint here adds style/correctness rules; everything is warn-only so it can
// never block a build or change existing behaviour.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.vercel/**',
      '**/*.cjs',
      '**/*.mjs',
      'bun.lock',
      'second brain/node_modules/**',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended.map(rule => ({
    ...rule,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        AbortController: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        FormData: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      // Keep it non-blocking: warn only, never fail a build.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'warn',
    },
  }
);
