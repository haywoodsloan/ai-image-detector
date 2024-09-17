import { app } from '@azure/functions';
import { createHash } from 'common/utilities/hash.js';
import { AiLabel } from 'common/utilities/huggingface.js';
import { getImageData, normalizeImage } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isDataUrl, isHttpUrl, shortenUrl } from 'common/utilities/url.js';

import { queryVoteByUser, queryVotedLabel } from '../services/db/voteColl.js';
import { classifyIfAi } from '../services/detector.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';

const DetectorScoreType = 'detector';
const UserScoreType = 'user';
const VoteScoreType = 'vote';

const methods = ['POST', 'OPTIONS'];
app.http('checkImage', {
  methods,
  authLevel: 'anonymous',

  handler: async (request, context) => {
    captureConsole(context);
    if (request.method === 'OPTIONS') {
      console.log(l`OPTIONS request ${{ methods }}`);
      return { status: 200, headers: { Allow: methods } };
    }

    /** @type {{url: string}} */
    const { url } = await request.json();

    // Check the access token is valid
    let userId;
    try {
      userId = await assertValidAuth(request);
      console.log(l`Checking image ${{ url: shortenUrl(url), userId }}`);
    } catch (error) {
      console.error(error);
      return createErrorResponse(401, error);
    }

    // Check url is valid
    if (!isHttpUrl(url) && !isDataUrl(url)) {
      const error = new Error('Must specify a valid URL');
      console.error(error);
      return createErrorResponse(400, error);
    }

    // Get the image data
    let data;
    try {
      data = await getImageData(url);
    } catch (error) {
      console.error(error);
      return createErrorResponse(404, error);
    }

    // Check if the user voted for a label themselves
    const hash = createHash(await normalizeImage(data), { alg: 'sha256' });
    const userLabel = await queryVoteByUser(userId, hash);
    if (userLabel) {
      const artificial = userLabel.voteLabel === AiLabel ? 1 : 0;
      return { jsonBody: { artificial, scoreType: UserScoreType } };
    }

    // Check for a voted class from the DB
    // If a voted class exists return it and the vote count
    const votedLabel = await queryVotedLabel(hash);
    if (votedLabel) {
      console.log(l`Voted label ${votedLabel}`);
      const artificial = votedLabel.voteLabel === AiLabel ? 1 : 0;
      return {
        jsonBody: {
          artificial,
          scoreType: VoteScoreType,
          voteCount: votedLabel.count,
        },
      };
    }

    // Get the AI classification score
    const artificial = await classifyIfAi(data);
    console.log(l`Detector result ${{ artificial }}`);
    return { jsonBody: { artificial, scoreType: DetectorScoreType } };
  },
});
