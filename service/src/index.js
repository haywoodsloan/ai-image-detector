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
  /** @type {HttpHandler} */
  const oldHandler = options.handler.bind(options);

  options.handler = async (request, context) => {
    captureConsole(context);
    if (request.method === 'OPTIONS') {
      const headers = {
        'Access-Control-Allow-Methods': options.methods,
        'Access-Control-Allow-Headers': ['Authorization'],
        'Access-Control-Allow-Origin': '*',
      };
      return { status: 200, headers };
    } else {
      const result = await oldHandler(request, context);
      result.headers ||= {};
      result.headers['Access-Control-Allow-Origin'] = '*';
      return result;
    }
  };

  options.methods.push('OPTIONS');
  return oldHttp(name, options);
};
