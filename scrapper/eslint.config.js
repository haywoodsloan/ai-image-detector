import globals from 'globals';
import pluginJs from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-var': 'error' },
  },
  pluginJs.configs.recommended,
  prettier,
];
