import { MongoMemoryServer } from 'mongodb-memory-server';

const MockDbPort = 8254;

const mongod = await MongoMemoryServer.create({
  instance: { port: MockDbPort },
});

console.log(`MongoDB test server running at ${mongod.getUri()}`);
mongod.on('stateChange', () => {
  if (mongod.state == 'stopped') {
    console.error('MongoDB test server has stopped unexpectedly');
    process.exit(1);
  }
});
