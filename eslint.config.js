import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * Typing gate is TypeScript strict (+ flags in tsconfig.app.json).
 * ESLint stays recommended + React Hooks / Refresh.
 *
 * Do NOT enable `strictTypeChecked` / `stylisticTypeChecked` until the
 * backlog (~2k findings) is cleaned — it was never the project baseline.
 *
 * React.StrictMode is required in src/main.tsx (removed Dec 2025; restored).
 */
export default tseslint.config(
  { ignores: ['dist', 'src/api/orval/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Harden beyond default recommended (still no type-aware pack).
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
)
