import { WebPubSubEventHandler } from '@azure/web-pubsub-express';
import express from 'express';

const MockPubSubPort = 8672;

const handler = new WebPubSubEventHandler('verifications', {
  path: '/pubsub',
  onConnected: (req) => {
    console.log(JSON.stringify(req));
  },
  onDisconnected: (req) => {
    console.log(JSON.stringify(req));
  },
  handleUserEvent: (req, res) => {
    console.log(JSON.stringify(req));
    res.success('Hey ' + req.data, req.dataType);
  },
});

const app = express();
app.use(handler.getMiddleware());

const mockUrl = `http://127.0.0.1:${MockPubSubPort}${handler.path}`;
const server = app.listen(MockPubSubPort, () =>
  console.log(`Azure Web PubSub test server ready at ${mockUrl}`)
);

server.once('close', () => {
  console.error('Azure Web PubSub test server has stopped unexpectedly');
  process.exit(1);
});
