import { createVuetify } from 'vuetify';

const Vuetify = createVuetify({ theme: { defaultTheme: 'dark' } });

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
