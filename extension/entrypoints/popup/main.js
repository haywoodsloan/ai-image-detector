import { createAppEx } from '@/utilities/vue';

import App from './App.vue';
import { invokeBackgroundTask } from '@/utilities/background.js';
import { InitAction } from '../background/actions/init.js';

await invokeBackgroundTask(InitAction);
createAppEx(App).mount('#app');
