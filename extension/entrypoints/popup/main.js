import { invokeBackgroundTask } from '@/utilities/background.js';
import { createAppEx } from '@/utilities/vue';

import { InitAction } from '../background/actions/init.js';
import App from './App.vue';

invokeBackgroundTask(InitAction);
createAppEx(App).mount('#app');
