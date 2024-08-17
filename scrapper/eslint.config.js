import pluginJs from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  pluginJs.configs.recommended,
  prettier,

  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-var': 'error' },
  },
];
