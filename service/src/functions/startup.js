import { setHfAccessToken } from 'common/utilities/huggingface.js';

setHfAccessToken(process.env.hfKey);
console.info('Hugging Face Token Set');
