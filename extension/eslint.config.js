import pluginJs from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

import autoImports from './.wxt/eslint-auto-imports.mjs';

export default [
  autoImports,
  ...vue.configs['flat/recommended'],
  pluginJs.configs.recommended,
  prettier,

  {
    languageOptions: { globals: globals.browser },
    rules: {
      'no-var': 'error',
      'vue/multi-word-component-names': ['error', { ignores: ['index'] }],
    },
  },
];
