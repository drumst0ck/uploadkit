import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Node-context files (scripts, config, *.mjs/cjs) get Node globals.
    files: [
      '**/*.mjs',
      '**/*.cjs',
      '**/scripts/**/*.{js,mjs,cjs,ts}',
      '**/*.config.{js,mjs,cjs,ts}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: [
      'dist/',
      '**/dist/**',
      '.next/',
      '**/.next/**',
      'node_modules/',
      '**/node_modules/**',
      'coverage/',
      '**/coverage/**',
      // `create-uploadkit-app` ships starter templates as source files that
      // will be scaffolded into user projects. They are not meant to pass the
      // monorepo's lint rules (they target Next/React/Svelte/Remix contexts
      // with their own tooling), so skip them here.
      '**/create-uploadkit-app/templates/**',
    ],
  },
];
