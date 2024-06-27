import { EmailClient } from '@azure/communication-email';
import { DefaultAzureCredential } from '@azure/identity';
import { isProd } from 'common/utilities/environment.js';
import memoize from 'memoize';

import { FunctionEndpoint } from '../index.js';
import { getTemplateHtml } from '../utilities/html.js';

const VerifyRequestHtml = 'verifyRequest';

const SenderAddress = isProd
  ? 'donotreply@ai-image-detector.com'
  : 'donotreply@ai-image-detector-dev.com';

export const getEmailClient = memoize(() => {
  const endpoint = process.env.COMM_ENDPOINT;
  return new EmailClient(endpoint, new DefaultAzureCredential());
});

/**
 * @param {string} email
 * @param {string} code
 */
export async function sendVerificationMail(email, code) {
  const emailTemplate = await getTemplateHtml(VerifyRequestHtml);
  const emailContent = emailTemplate({ link: buildVerificationLink(code) });

  /** @type {EmailMessage} */
  const message = {
    senderAddress: SenderAddress,
    content: {
      subject: 'AI Image Detector - Verify Your Email',
      html: emailContent,
    },
    recipients: {
      to: [{ address: email }],
    },
  };

  // Poll for the message to finish sending
  const emailClient = getEmailClient();
  const poller = await emailClient.beginSend(message);
  const result = await poller.pollUntilDone();

  // Throw if the message failed to send
  if (result.error) throw result.error;
}

function buildVerificationLink(code) {
  return `${FunctionEndpoint}/verifyAuth?code=${code}`;
}
