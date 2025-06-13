import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';

export const OverlayClasses = ['v-overlay-container'];
export const ExtensionId = 'aid-3bi9lk5g';

/** @type {VuePlugin} */
let vuetifyPlugin;

/**
 * @param {Component} root
 * @param {Data} [props]
 * @returns
 */
export function createAppEx(root, props) {
  vuetifyPlugin ||= createVuetify({
    theme: {
      defaultTheme: 'dark',
      stylesheetId: `vuetify-${ExtensionId}`,
      scope: `[data-${ExtensionId}]`,
    },
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi },
    },
  });

  const app = createApp(root, props);
  app.use(vuetifyPlugin);
  return app;
}
