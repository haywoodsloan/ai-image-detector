export default {
  singleQuote: true,
  trailingComma: 'es5',
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrder: ['StyleProvider.vue$', '^@\\/', '^[./]'],
  plugins: ['@trivago/prettier-plugin-sort-imports'],
};
