// Analyse statique : règles recommandées JavaScript et TypeScript, règles des hooks React.
// Lancer : npm run lint
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'tests/e2e/.out',
      'scripts/eval-assistant/.build',
      'public',
      'impression',
      'marketing',
      'outils',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts', 'scripts/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Les variables inutilisées sont déjà refusées par TypeScript (noUnusedLocals / noUnusedParameters)
      '@typescript-eslint/no-unused-vars': 'off',
      // Espaces insécables (« 25 000 F ») voulus dans les textes et les expressions régulières
      'no-irregular-whitespace': [
        'error',
        { skipStrings: true, skipTemplates: true, skipRegExps: true, skipComments: true },
      ],
    },
  },
  {
    files: ['server/**/*.js', 'scripts/**/*.{js,mjs}', 'tests/**/*.{js,mjs,cjs}', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-irregular-whitespace': [
        'error',
        { skipStrings: true, skipTemplates: true, skipRegExps: true, skipComments: true },
      ],
    },
  },
  {
    files: ['tests/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
  },
);
