import { app } from '@azure/functions';
import { isProd } from 'common/utilities/environment.js';
import { createHash } from 'common/utilities/hash.js';
import { AllLabels } from 'common/utilities/huggingface.js';
import { getImageData } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isHttpUrl } from 'common/utilities/url.js';
import { EntityId, getClient, input } from 'durable-functions';

import { queryVotedLabel, upsertVotedLabel } from '../services/db/voteColl.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { captureConsole } from '../utilities/log.js';
import { UploadImageEntity } from './uploadImage.js';

app.http('voteImageLabel', {
  methods: ['POST'],
  authLevel: isProd ? 'anonymous' : 'function',
  extraInputs: [input.durableClient()],
  handler: async (request, context) => {
    captureConsole(context);

    /** @type {{url: string, voteLabel: string}} */
    const { url, voteLabel } = await request.json();

    // Check the url is valid
    if (!isHttpUrl(url)) {
      const error = new Error('Must specify a valid URL');
      console.error(error);
      return createErrorResponse(400, error);
    }

    // Check the vote is valid
    if (!AllLabels.includes(voteLabel)) {
      const error = new Error(l`voteLabel must be one of ${AllLabels}`);
      console.error(error);
      return createErrorResponse(400, error);
    }

    // Check the access token is valid
    let userId;
    try {
      userId = await assertValidAuth(request);
    } catch (error) {
      console.error(error);
      return createErrorResponse(401, error);
    }

    // Track the vote by the image's hash
    console.log(l`Vote image ${{ url, userId, voteLabel }}`);
    const data = await getImageData(url);
    const hash = createHash(data, { alg: 'sha256', url: true });

    // Check what the current voted label is
    const oldLabel = await queryVotedLabel(hash);
    console.log(l`Original voted label ${{ hash, label: oldLabel }}`);

    // Add the vote and check the new label
    const vote = await upsertVotedLabel(hash, userId, voteLabel);
    const newLabel = await queryVotedLabel(hash);
    console.log(l`New voted label ${{ hash, label: newLabel }}`);

    // Check if the voted label has changed and upload if so
    if (newLabel && oldLabel !== newLabel) {
      console.log(l`Voted label changed, uploading ${{ url }}`);

      const entityId = new EntityId(UploadImageEntity, hash);
      const input = { data, url, label: newLabel };

      await getClient(context).signalEntity(entityId, null, input);
    }

    return { jsonBody: vote };
  },
});
