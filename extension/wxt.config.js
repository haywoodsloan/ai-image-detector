import prefixer from 'postcss-prefix-selector';
import vuetify from 'vite-plugin-vuetify';
import svgLoader from 'vite-svg-loader';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    permissions: ['storage', 'webNavigation'],
  },
  vite: () => ({
    plugins: [svgLoader(), vuetify()],
    css: {
      postcss: {
        plugins: [
          prefixer({
            prefix: '[data-aid-bi39lk5g]',
            ignoreFiles: ['index.html', 'popup.html'],
            exclude: [
              /\[data-aid-bi39lk5g\]/,
              /\[data-v-[a-z0-9A-Z]+\]/,
              /\.v-overlay/,
              /\.v-dialog/,
            ],
          }),
        ],
      },
    },
  }),
});
