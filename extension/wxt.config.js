import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vuetify from 'vite-plugin-vuetify';
import svgLoader from 'vite-svg-loader';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [
      svgLoader(),
      vuetify(),
      nodePolyfills({
        include: ['crypto'],
        globals: { global: false },
      }),
    ],
  }),
});
