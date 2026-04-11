import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals'),
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: [
      'hooks/useErrorHandler.ts',
      'hooks/useExchangeRates.ts',
      'providers/cbrProvider.ts',
      'services/exchangeRateCache.ts',
      'services/exchangeRateFacade.ts',
      'services/exchangeRateService.ts',
      'services/exchangeRateSystem.ts',
      'storage/indexedDBStorage.ts',
      'store/slices/duties.ts',
      'store/slices/exchangeRates.ts',
      'utils/indexedDB.ts',
      'utils/logger.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      'contexts/ReAuthContext.tsx',
      'contexts/TimezoneContext.tsx',
      'hooks/useAccountSwitcher.ts',
      'hooks/useExchangeRates.ts',
      'hooks/useWorkDuties.ts',
      'hooks/useWorkIncome.ts',
      'hooks/works/useWorkDetail.ts',
      'hooks/works/useWorksAnalytics.ts',
    ],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];

export default eslintConfig;
