import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';

const Vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
});

export const AltProviderClasses = ['v-overlay-container'];

/**
 * @param {Component} root
 * @param {Data} [props]
 * @returns
 */
export function createAppEx(root, props) {
  const app = createApp(root, props);
  app.use(Vuetify);
  return app;
}
