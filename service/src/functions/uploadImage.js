import { sanitizeFileName } from 'common/utilities/file.js';
import { createHash } from 'common/utilities/hash.js';
import { deleteImage, replaceImage } from 'common/utilities/huggingface.js';
import { TrainSplit } from 'common/utilities/huggingface.js';
import { uploadImages } from 'common/utilities/huggingface.js';
import { getExt, sanitizeImage } from 'common/utilities/image.js';
import { l } from 'common/utilities/string.js';
import { isHttpUrl } from 'common/utilities/url.js';
import df from 'durable-functions';

import { captureConsole } from '../utilities/log.js';

export const UploadImageEntity = 'uploadImage';

const PendingBranch = 'pending';

df.app.entity(UploadImageEntity, async (context) => {
  captureConsole(context);
  console.log(l`Starting entity ${{ entityName: UploadImageEntity }}`);

  /** @type {{data: {data: Uint8Array}, url: string, label: string}} */
  const { data: rawData, url, label } = context.df.getInput();

  // Sanitize the image first
  let data;
  try {
    data = await sanitizeImage(Buffer.from(rawData));
  } catch (error) {
    console.error(l`Image validation failed ${{ url, error }}`);
    throw error;
  }

  // Only include the origin if url is http=
  const origin = isHttpUrl(url) ? new URL(url) : null;
  const ext = await getExt(data);

  // Build the image properties, always use the train split
  // Use the hash of the sanitized image to store it
  const hash = createHash(data);
  const fileName = sanitizeFileName(`${hash}.${ext}`);
  const split = TrainSplit;
  const content = new Blob([data]);

  /** @type {HfImage} */
  const image = { fileName, label, split, content, origin };
  if (label) {
    try {
      // If an existing image either replace ir or skip the image (if label is the same)
      (await replaceImage(image, PendingBranch))
        ? console.log(l`Image replaced on Hugging Face ${{ fileName, label }}`)
        : console.log(l`Matching image on Hugging Face ${{ fileName, label }}`);
    } catch {
      // If replace errors then it's a new file to upload
      await uploadImages([image], PendingBranch);
      console.log(l`Image uploaded to Hugging Face ${{ fileName, label }}`);
    }
  } else {
    try {
    await deleteImage(image, PendingBranch);
    console.log(l`Image deleted from Hugging Face ${{ fileName }}`);
    } catch {
      console.log(l`No change to Hugging Face ${{fileName}}`);
    }
  }
});
