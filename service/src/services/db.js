import { isDev } from 'common/utilities/environment.js';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { AiClassLabel, DetectorVersion, RealClassLabel } from './detector.js';

const MinVoteCount = 5;

const dbUri = isDev
  ? (await MongoMemoryServer.create()).getUri()
  : process.env.dbConStr;

const client = await MongoClient.connect(dbUri);
const db = client.db('service');
const images = db.collection('images');

/**
 * @param {string} hash
 * @returns {Promise<string>}
 */
export async function getImageClass(hash) {
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
export async function setImageClass(hash, imgClass) {
  await images.updateOne(
    { hash },
    { $set: { hash, imgClass, detVer: DetectorVersion } },
    { upsert: true }
  );
}

/**
 * @param {string} hash
 */
export async function voteImageAI(hash) {
  await images.updateOne(
    { hash },
    { $set: { hash }, $inc: { aiVotes: 1 } },
    { upsert: true }
  );
}

/**
 * @param {string} hash
 */
export async function voteImageReal(hash) {
  await images.updateOne(
    { hash },
    { $set: { hash }, $inc: { realVotes: 1 } },
    { upsert: true }
  );
}
