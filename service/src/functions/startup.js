import { setHfAccessToken } from 'common/utilities/huggingface.js';

setHfAccessToken(process.env.HF_KEY);
console.info('Hugging Face Token Set');
