import memoize, { memoizeClear } from 'memoize';
import { MongoClient } from 'mongodb';

const DbName = 'service';

export const getServiceDb = memoize(async () => {
  // If local testing use a in memory mongodb instance
  const mongoUrls = [process.env.DB_CONN_STR, process.env.DB_CONN_STR_2];

  // Try each connection URL option
  const errors = [];
  for (const url of mongoUrls) {
    try {
      const client = await MongoClient.connect(url);

      client.once('serverHeartbeatFailed', () => memoizeClear(getServiceDb));
      client.once('connectionClosed', () => memoizeClear(getServiceDb));

      return client.db(DbName);
    } catch (error) {
      console.warn('Failed to connect to MongoDB', error);
      errors.push(error);
    }
  }

  // Throw the errors if all URLs were used
  throw errors.length === 1 ? errors[0] : AggregateError(errors);
});
