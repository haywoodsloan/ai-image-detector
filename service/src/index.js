import { isProd } from 'common/utilities/environment.js';
import { setHfAccessToken } from 'common/utilities/huggingface.js';

export const FunctionEndpoint = isProd
  ? 'https://ai-image-detector-prod-eastus2.azurewebsites.net/api'
  : 'https://ai-image-detector-dev-eastus2.azurewebsites.net/api';

setHfAccessToken(process.env.HF_KEY);
console.info('Hugging Face Token Set');
