import { app } from '@azure/functions';
import { createHash } from 'common/utilities/hash.js';
import { AllLabels } from 'common/utilities/huggingface.js';
import { getImageData, normalizeImage } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isDataUrl, isHttpUrl, shortenUrl } from 'common/utilities/url.js';
import { EntityId, getClient, input } from 'durable-functions';

import {
  deleteVote,
  queryVote,
  queryVotedLabel,
  queryVotesByUser,
  upsertVotedLabel,
} from '../services/db/voteColl.js';
import { assertValidAuth } from '../utilities/auth.js';
import { createErrorResponse } from '../utilities/error.js';
import { UploadImageEntity } from './uploadImage.js';

app.http('imageVote', {
  route: 'imageVote/{voteId?}',
  methods: ['POST', 'GET', 'DELETE'],
  extraInputs: [input.durableClient()],
  async handler(request, context) {
    // Check the access token is valid
    let userId;
    try {
      userId = await assertValidAuth(request);
    } catch (error) {
      console.error(error);
      return createErrorResponse(401, error);
    }

    switch (request.method) {
      case 'POST': {
        /** @type {{url: string, voteLabel: string, skipUpload?: boolean}} */
        const { url, voteLabel, skipUpload = false } = await request.json();

        // Check the url is valid
        if (!isHttpUrl(url) && !isDataUrl(url)) {
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

        // Get the image data
        let data;
        try {
          data = await getImageData(url);
        } catch (error) {
          console.error(error);
          return createErrorResponse(404, error);
        }

        // Track the vote by the image's hash
        const shortUrl = shortenUrl(url);
        console.log(l`Vote image ${{ url: shortUrl, userId, voteLabel }}`);
        const hash = createHash(await normalizeImage(data), { alg: 'sha256' });

        // Add the vote and check the new label
        const vote = await upsertVotedLabel(hash, userId, voteLabel);
        const { voteLabel: newLabel } = (await queryVotedLabel(hash)) ?? {};
        console.log(l`New voted label ${{ hash, label: newLabel }}`);

        // Check if the voted label has changed and upload if so
        // Skip upload if requested in vote
        if (skipUpload && newLabel) {
          console.log(l`Skip upload requested ${{ url: shortenUrl(url) }}`);
        } else {
          const entityId = new EntityId(UploadImageEntity, hash);
          await getClient(context).signalEntity(entityId, null, {
            data,
            ...(isHttpUrl(url) && { url }),
            label: newLabel,
          });
        }

        return { jsonBody: vote };
      }

      case 'GET': {
        /** @type {{voteId: string}} */
        const { voteId } = request.params;
        if (voteId) {
          const vote = await queryVote(voteId);
          if (!vote) {
            const error = new Error('No vote with the specified ID');
            console.error(error);
            return createErrorResponse(404, error);
          }

          if (!vote.userId.equals(userId)) {
            const error = new Error('Missing permission to access this vote');
            console.error(error);
            return createErrorResponse(403, error);
          }

          return { jsonBody: vote };
        }

        const votes = await queryVotesByUser(userId);
        console.log(l`User votes ${{ userId, voteCount: votes.length }}`);
        return { jsonBody: votes };
      }

      case 'DELETE': {
        /** @type {{id: string}} */
        const { voteId } = request.params;

        // Must have voteId
        if (!voteId) {
          const error = new Error('Must specify an ID');
          console.error(error);
          return createErrorResponse(400, error);
        }

        // Make sure the user owns this vote
        // Just skip if there's no vote anymore
        const vote = await queryVote(voteId);
        if (vote && !vote.userId.equals(userId)) {
          const error = new Error('Missing permission to delete this vote');
          console.error(error);
          return createErrorResponse(403, error);
        } else if (!vote) return { status: 204 };

        // Delete the vote if it exists
        console.log(l`Delete vote ${{ voteId, userId }}`);
        await deleteVote(voteId);

        return { status: 204 };
      }
    }
  },
});
