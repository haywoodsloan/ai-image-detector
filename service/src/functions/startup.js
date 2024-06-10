import { setHfAccessToken } from 'common/utilities/huggingface.js';
import { loadSettings } from 'common/utilities/settings.js';

const { hfKey } = await loadSettings();
console.info('Settings loaded');

setHfAccessToken(hfKey);
console.info('Hugging Face Token Set');
