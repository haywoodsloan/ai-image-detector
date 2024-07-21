import pluginJs from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import vue from 'eslint-plugin-vue';

import autoImports from './.wxt/eslint-auto-imports.mjs';

export default [
  {
    languageOptions: { globals: globals.browser },
    rules: { 'no-var': 'error' },
  },
  autoImports,
  ...vue.configs['flat/recommended'],
  pluginJs.configs.recommended,
  prettier,
];
