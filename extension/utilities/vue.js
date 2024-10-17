import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';

export const OverlayClasses = ['v-overlay-container'];
export const ExtensionId = 'aid-3bi9lk5g';

const RootRegex = /(\s|^):root(\s*{)/g;

const Vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
    cspNonce: ExtensionId,
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
});

/**
 * @param {Component} root
 * @param {Data} [props]
 * @returns
 */
export function createAppEx(root, props) {
  const app = createApp(root, props);

  app.use(Vuetify);
  modThemeCss();

  return app;
}

function modThemeCss() {
  const styles = document.head.querySelectorAll('style[nonce]');
  const vuetifyStyle = [...styles].find(({ nonce }) => nonce === ExtensionId);

  const original = vuetifyStyle.innerHTML;
  const modified = original.replace(RootRegex, `$1[data-${ExtensionId}]$2`);

  vuetifyStyle.innerHTML = modified;
}
