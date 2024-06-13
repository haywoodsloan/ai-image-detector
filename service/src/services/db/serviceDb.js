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
  const mongoUrl = isLocal
    ? (await startMockDb()).getUri()
    : process.env.dbConStr;

  const client = await MongoClient.connect(mongoUrl);
  return client.db(DbName);
});
