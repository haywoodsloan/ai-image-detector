import { DefaultAzureCredential } from '@azure/identity';
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import memoize from 'memoize';

import { PendingAuthTimeout } from './db/authColl.js';

const ValidationHub = 'validations';

export const getValidationPubSub = memoize(() => {
  const endpoint = `https://${process.env.PUBSUB_HOSTNAME}`;
  const creds = new DefaultAzureCredential();
  return new WebPubSubServiceClient(endpoint, creds, ValidationHub);
});

/**
 * @param {string | ObjectId} userId
 */
export async function getValidationSocketUrl(userId) {
  const client = getValidationPubSub();
  const { token } = await client.getClientAccessToken({
    userId: userId.toString(),
    expirationTimeInMinutes: PendingAuthTimeout.getMinutes(),
  });

  return `wss://${process.env.PUBSUB_HOSTNAME}/client/hubs/${ValidationHub}?access_token=${token}`;
}

/**
 * @param {string | ObjectId} userId
 * @param {Record<string, string>} validation
 */
export async function publishValidation(userId, validation) {
  const client = getValidationPubSub();
  await client.sendToUser(userId.toString(), validation);
}
