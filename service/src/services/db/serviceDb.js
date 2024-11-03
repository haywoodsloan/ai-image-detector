import { CosmosDBManagementClient, KnownKeyKind } from '@azure/arm-cosmosdb';
import { DefaultAzureCredential } from '@azure/identity';
import { l } from 'common/utilities/string.js';
import memoize, { memoizeClear } from 'memoize';
import { MongoClient } from 'mongodb';

const DbName = 'service';
const KeyKinds = [KnownKeyKind.Primary, KnownKeyKind.Secondary];

export const getServiceDb = memoize(async () => {
  const creds = new DefaultAzureCredential();
  const client = new CosmosDBManagementClient(creds, process.env.SUB_ID);

  console.log('Getting CosmosDB connection strings');
  const { connectionStrings } =
    await client.databaseAccounts.listConnectionStrings(
      process.env.DB_RG_NAME,
      process.env.DB_NAME
    );

  const mongoUrls = connectionStrings
    .filter(({ keyKind }) => KeyKinds.includes(keyKind.toLowerCase()))
    .map(({ connectionString }) => connectionString);

  const urlCount = mongoUrls.length;
  console.log(l`Attempting to connect to CosmosDB ${{ urlCount }}`);

  // Try each connection URL option
  const errors = [];
  for (const url of mongoUrls) {
    try {
      const client = await MongoClient.connect(url, {
        retryReads: true,
      });

      client.once('serverHeartbeatFailed', (event) => {
        console.error('MongoDB heartbeat failed', event);
        memoizeClear(getServiceDb);
      });

      client.once('connectionClosed', (event) => {
        console.error('MongoDB connection closed', event);
        memoizeClear(getServiceDb);
      });

      return client.db(DbName);
    } catch (error) {
      console.warn('Failed to connect to MongoDB', error);
      errors.push(error);
    }
  }

  // Throw the errors if all URLs were used
  throw errors.length === 1 ? errors[0] : AggregateError(errors);
});
