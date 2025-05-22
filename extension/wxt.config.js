import prefixer from 'postcss-prefix-selector';
import remToPx from 'postcss-rem-to-pixel';
import vuetify from 'vite-plugin-vuetify';
import svgLoader from 'vite-svg-loader';
import { defineConfig } from 'wxt';

import { OverlayClasses } from './utilities/vue.js';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'AI Image Detector',
    permissions: [
      'storage',
      'webNavigation',
      'contextMenus',
      'activeTab',
      'http://*/*',
      'https://*/*',
      'file:///*',
    ],
    browser_specific_settings: {
      gecko: { id: 'DoNotReply@ai-image-detector.com' },
    },
  },
  vite: () => ({
    legacy: {
      skipWebSocketTokenCheck: true,
    },
    plugins: [
      svgLoader({ svgo: false }),
      vuetify({
        styles: { configFile: 'styles/settings.scss' },
      }),
    ],
    css: {
      postcss: {
        plugins: [
          prefixer({
            prefix: '[data-aid-3bi9lk5g]',
            ignoreFiles: ['index.html', 'popup.html'],
            exclude: [
              /\[data-aid-3bi9lk5g\]/,
              /\[data-v-[a-z0-9A-Z]+\]/,
              /\[data-imgfix-47dh3\]/,
            ],

            transform: (prefix, orig, prefixed) =>
              isOverlay(orig) ? `${prefix}${orig}` : prefixed,
          }),
          remToPx({
            rootValue: 16,
            propList: ['*'],
            mediaQuery: true,
          }),
        ],
      },
    },
  }),
});

function isOverlay(selector) {
  return OverlayClasses.some((c) => selector.startsWith(`.${c}`));
}
