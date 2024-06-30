import { isDev, isProd } from 'common/utilities/environment.js';
import { setHfAccessToken } from 'common/utilities/huggingface.js';
import { l } from 'common/utilities/string.js';

export const FunctionEndpoint =
  (isProd && 'https://api.ai-image-detector.com') ||
  (isDev && 'https://api.ai-image-detector-dev.com') ||
  'http://localhost:7071/api';
console.log(l`Function endpoint ${{ url: FunctionEndpoint }}`);

setHfAccessToken(process.env.HF_KEY);
console.log('Hugging Face Token Set');
