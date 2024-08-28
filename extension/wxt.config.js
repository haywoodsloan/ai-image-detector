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
            prefix: '[data-aid-style-provider]',
            ignoreFiles: ['index.html', 'popup.html'],
            exclude: [
              /\[data-aid-style-provider\]/,
              /\[data-v-[^\]]+\]/,
              /\.v-overlay/,
              /\.v-dialog/,
            ],
          }),
        ],
      },
    },
  }),
});
