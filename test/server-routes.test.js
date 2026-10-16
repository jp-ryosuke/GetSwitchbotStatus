const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createGetDevicesHandler,
  createSendCommandHandler
} = require('../server/routes/devices');
const {
  createCameraEventStore,
  createReceiveCameraEventHandler,
  createListCameraEventsHandler
} = require('../server/routes/camera-events');

function responseRecorder() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    sendStatus(code) { this.statusCode = code; return this; }
  };
}

test('デバイス一覧ルートは API クライアントの一覧を返す', async () => {
  const expected = [{ deviceId: 'light-1', deviceType: 'Light' }];
  const handler = createGetDevicesHandler({ async getDevices() { return expected; } });
  const res = responseRecorder();

  await handler({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, expected);
});

test('コマンドルートは不正入力を拒否し、有効なコマンドを API クライアントへ渡す', async () => {
  const calls = [];
  const handler = createSendCommandHandler({
    async sendCommand(...args) { calls.push(args); return { statusCode: 100 }; }
  });
  const invalidResponse = responseRecorder();

  await handler({ params: { deviceId: 'light-1' }, body: { command: 'unlockEverything' } }, invalidResponse);

  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(calls.length, 0);

  const validResponse = responseRecorder();
  await handler({
    params: { deviceId: 'light-1' }, body: { command: 'turnOn' }
  }, validResponse);
  assert.equal(validResponse.statusCode, 200);
  assert.deepEqual(calls, [['light-1', 'turnOn', 'default']]);
});

test('カメラ Webhook ルートはイベントを受信し、デバイス単位で返す', () => {
  const store = createCameraEventStore({ now: () => 1700000000000 });
  const receive = createReceiveCameraEventHandler(store);
  const list = createListCameraEventsHandler(store);
  const event = {
    eventType: 'changeReport',
    context: {
      deviceMac: 'AA:BB:CC', deviceType: 'WoCamera', detectionState: 'DETECTED',
      timeOfSample: 1700000000000,
      motionEvent: { img: 'https://example.test/snapshot.jpg', detectionType: 'motion' }
    }
  };
  const receiveResponse = responseRecorder();

  receive({ body: event }, receiveResponse);

  assert.equal(receiveResponse.statusCode, 200);
  const listResponse = responseRecorder();
  list({ query: { deviceId: 'AABBCC' } }, listResponse);
  assert.equal(listResponse.body.length, 1);
  assert.equal(listResponse.body[0].detectionState, 'motion');
  assert.equal(listResponse.body[0].imageUrl, 'https://example.test/snapshot.jpg');
});

test('不正なカメラ Webhook は拒否する', () => {
  const handler = createReceiveCameraEventHandler(createCameraEventStore());
  const res = responseRecorder();

  handler({ body: { context: {} } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'invalid SwitchBot webhook event' });
});
