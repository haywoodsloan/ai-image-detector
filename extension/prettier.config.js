export default {
  singleQuote: true,
  trailingComma: 'es5',
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrder: ['^[./]'],
  plugins: ['@trivago/prettier-plugin-sort-imports'],
};
