import { isLocal } from 'common/utilities/environment.js';
import memoize from 'memoize';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

const DbName = 'service';
const MockDbPort = 8254;

export const startMockDb = memoize(() =>
  MongoMemoryServer.create({
    instance: { port: MockDbPort },
  })
);

export const getServiceDb = memoize(async () => {
  // If local testing use a in memory mongodb instance
  const mongoUrls = isLocal
    ? [(await startMockDb()).getUri()]
    : [process.env.DB_CONN_STR, process.env.DB_CONN_STR_2];

  // Try each connection URL option
  const errors = [];
  for (const url of mongoUrls) {
    try {
      const client = await MongoClient.connect(url);
      return client.db(DbName);
    } catch (error) {
      errors.push(error);
    }
  }

  // Throw the errors if all URLs were used
  throw errors.length === 1 ? errors[0] : AggregateError(errors);
});
