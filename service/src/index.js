import { app } from '@azure/functions';
import { isDev, isProd } from 'common/utilities/environment.js';
import { setHfAccessToken } from 'common/utilities/huggingface.js';
import { l } from 'common/utilities/string.js';

import { captureConsole } from './utilities/log.js';

export const FunctionEndpoint =
  (isProd && 'https://api.ai-image-detector.com') ||
  (isDev && 'https://api.ai-image-detector-dev.com') ||
  'http://localhost:7071/api';

console.log(l`Function endpoint ${{ url: FunctionEndpoint }}`);

setHfAccessToken(process.env.HF_KEY);
console.log('Hugging Face Token Set');

const oldHttp = app.http.bind(app);
app.http = (name, options) => {
  const oldHandler = options.handler.bind(options);
  options.handler = (request, context) => {
    captureConsole(context);
    if (request.method === 'OPTIONS') {
      const headers = {
        'Access-Control-Allow-Methods': options.methods,
        'Access-Control-Allow-Headers': isDev ? ['X-Dev-Key'] : [],
      };
      return { status: 200, headers };
    } else return oldHandler(request, context);
  };

  options.methods.push('OPTIONS');
  return oldHttp(name, options);
};
