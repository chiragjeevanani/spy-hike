import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

// Deliberately narrow. This config exists to catch the class of bug that a
// green `vite build` cannot: Rollup bundles an undeclared identifier like a
// missing `useMemo` import without complaint, and it only blows up as a
// ReferenceError in the browser, on whichever screen happens to use it.
//
// Style rules are left off on purpose — the codebase predates any linter and
// turning them on would bury the real errors in thousands of warnings.
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'e2e/**', '*.config.js'],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'react-hooks': reactHooks, react },
    rules: {
      // Without these, every component and icon referenced only inside JSX
      // reads as an unused import — 1,100 false positives that would bury the
      // handful of real errors.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      // The one that matters: an identifier used but never imported/declared.
      'no-undef': 'error',
      // Hooks called conditionally or outside a component corrupt React's
      // internal state in ways that surface far from the cause.
      'react-hooks/rules-of-hooks': 'error',
      // Stale-closure bugs. Warn rather than error — the existing code has
      // intentional omissions that would need reviewing one at a time.
      'react-hooks/exhaustive-deps': 'warn',
      // Unused imports are how a "cleaned up" refactor leaves dead references.
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      // JSX counts as using the identifier; without this React/components read
      // as unused under the rule above.
      'no-undef-init': 'off',
    },
  },
  {
    // Vitest globals in test files.
    files: ['src/**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
];
