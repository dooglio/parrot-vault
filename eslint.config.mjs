import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'dist-electron/**', 'node_modules/**', 'build/**', 'release/**'],
  },

  // ── Base JS rules ────────────────────────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript rules (shared) ────────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ── Renderer (React) — src/ and shared/ ──────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}', 'shared/**/*.ts'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        confirm: 'readonly',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/prop-types': 'off', // We use TypeScript for prop types
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Prettier (format errors as ESLint errors)
      'prettier/prettier': 'error',

      ...prettierConfig.rules,
    },
  },

  // ── Electron main process — electron/ ────────────────────────────────────
  {
    files: ['electron/**/*.ts'],
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off', // main process uses require()
      'prettier/prettier': 'error',
      ...prettierConfig.rules,
    },
  }
)
