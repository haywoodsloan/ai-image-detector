import prefixer from 'postcss-prefix-selector';
import vuetify from 'vite-plugin-vuetify';
import svgLoader from 'vite-svg-loader';
import { defineConfig } from 'wxt';

import { OverlayClasses } from './utilities/vue.js';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    permissions: ['storage', 'webNavigation', 'contextMenus', 'activeTab'],
  },
  vite: () => ({
    plugins: [svgLoader(), vuetify()],
    css: {
      postcss: {
        plugins: [
          prefixer({
            prefix: '[data-aid-3bi9lk5g]',
            ignoreFiles: ['index.html', 'popup.html'],
            exclude: [/\[data-aid-3bi9lk5g\]/, /\[data-v-[a-z0-9A-Z]+\]/],

            transform(prefix, orig, prefixed) {
              const isOverlay = OverlayClasses.some((c) =>
                orig.startsWith(`.${c}`)
              );

              if (isOverlay) return `${prefix}${orig}`;
              else return prefixed;
            },
          }),
        ],
      },
    },
  }),
});
[];
