import { app } from '@azure/functions';
import { createHash } from 'common/utilities/hash.js';
import { AiLabel } from 'common/utilities/huggingface.js';
import { getImageData, normalizeImage } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isDataUrl, isHttpUrl, shortenUrl } from 'common/utilities/url.js';

import { queryVoteByImage } from '../services/db/voteColl.js';
import { classifyIfAi } from '../services/detector.js';
import { InvalidAuthError, assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { getVotedLabel } from '../utilities/vote.js';
import { isDev } from 'common/utilities/environment.js';

const DetectorScoreType = 'detector';
const UserScoreType = 'user';
const VoteScoreType = 'vote';

app.http('imageAnalysis', {
  methods: ['POST'],
  authLevel: isDev ? 'function' : 'anonymous', // TODO: remove once frontdoor is back
  async handler(request) {
    /** @type {{url: string, referer?: string}} */
    const { url, referer } = await request.json();

    // Check the access token is valid
    let userId;
    try {
      userId = await assertValidAuth(request);
      console.log(l`Checking image ${{ url: shortenUrl(url), userId }}`);
    } catch (error) {
      console.error(error);
      if (!(error instanceof InvalidAuthError)) throw error;
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
      data = await getImageData(url, { referer });
    } catch (error) {
      console.error(error);
      return createErrorResponse(404, error);
    }

    // Check if the user voted for a label themselves
    const hash = createHash(await normalizeImage(data), { alg: 'sha256' });
    const userLabel = await queryVoteByImage(userId, hash);
    if (userLabel) {
      const artificial = userLabel.voteLabel === AiLabel ? 1 : 0;
      return {
        jsonBody: {
          artificial,
          scoreType: UserScoreType,
          voteId: userLabel._id,
        },
      };
    }

    // Check for a voted class from the DB
    // If a voted class exists return it and the vote count
    const votedLabel = await getVotedLabel(hash);
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
    const artificial = await classifyIfAi(data, hash);
    console.log(l`Detector result ${{ artificial }}`);
    return { jsonBody: { artificial, scoreType: DetectorScoreType } };
  },
});
