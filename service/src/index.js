import { isProd } from 'common/utilities/environment.js';
import { setHfAccessToken } from 'common/utilities/huggingface.js';

export const FunctionEndpoint = isProd
  ? 'https://api.ai-image-detector.com'
  : 'https://api.ai-image-detector-dev.com';

setHfAccessToken(process.env.HF_KEY);
console.info('Hugging Face Token Set');
