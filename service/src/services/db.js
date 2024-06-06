import { isDev } from 'common/utilities/environment.js';
import memoize from 'memoize';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { AiClassLabel, DetectorVersion, RealClassLabel } from './detector.js';

const DbName = 'service';
const CollName = 'images';

const MinVoteCount = 5;
const MockDbPort = 8254;
const ExpireTime = 30 * 24 * 60 * 60;

const startMockDb = memoize(() =>
  MongoMemoryServer.create({
    instance: { port: MockDbPort },
  })
);

const getImageCollection = memoize(async () => {
  const dbUri = isDev ? (await startMockDb()).getUri() : process.env.dbConStr;
  const client = await MongoClient.connect(dbUri);
  const db = client.db(DbName);

  /** @type {ImageCollection} */
  const images = db.collection(CollName);

  try {
    // Create a TTL index on the last modified date
    await images.createIndex(
      { lastModDate: 1 },
      { expireAfterSeconds: ExpireTime }
    );
  } catch (error) {
    // Update the expire time if the index exists (only if value is changed)
    if (error.codeName !== 'IndexOptionsConflict') throw error;
    await db.command({
      collMod: images.collectionName,
      index: {
        keyPattern: { lastModDate: 1 },
        expireAfterSeconds: ExpireTime,
      },
    });
  }

  return images;
});

/**
 * @param {string} hash
 * @returns {Promise<string>}
 */
export async function retrieveImageClass(hash) {
  const images = await getImageCollection();
  const image = await images.findOne({ hash });

  // Check votes
  if (
    image?.realVotes > MinVoteCount &&
    image?.realVotes > (image?.aiVotes ?? 0)
  ) {
    return RealClassLabel;
  }

  if (
    image?.aiVotes > MinVoteCount &&
    image?.aiVotes > (image?.realVotes ?? 0)
  ) {
    return AiClassLabel;
  }

  // Skip stored class label if detector version doesn't match
  if (image?.detVer !== DetectorVersion) return null;
  return image.imgClass;
}

/**
 * @param {string} hash
 * @param {string} imgClass
 */
export async function storeImageClass(hash, imgClass) {
  const images = await getImageCollection();
  await images.updateOne(
    { hash },
    {
      $set: {
        hash,
        imgClass,
        detVer: DetectorVersion,
        lastModDate: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * @param {string} hash
 */
export async function storeAiVote(hash) {
  const images = await getImageCollection();
  await images.updateOne(
    { hash },
    {
      $set: { hash, lastModDate: new Date() },
      $inc: { aiVotes: 1 },
    },
    { upsert: true }
  );
}

/**
 * @param {string} hash
 */
export async function storeRealVote(hash) {
  const images = await getImageCollection();
  await images.updateOne(
    { hash },
    {
      $set: { hash, lastModDate: new Date() },
      $inc: { realVotes: 1 },
    },
    { upsert: true }
  );
}
