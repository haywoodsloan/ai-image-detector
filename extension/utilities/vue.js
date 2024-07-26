import { createVuetify } from 'vuetify';
import 'vuetify/styles';

const vuetify = createVuetify();

/**
 * @param {Component} root
 * @param {Data} [props]
 * @returns
 */
export function createAppEx(root, props) {
  const app = createApp(root, props);
  app.use(vuetify);
  return app;
}
