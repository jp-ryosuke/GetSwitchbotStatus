const test = require('node:test');
const assert = require('node:assert/strict');
const { createSwitchBotApi, validateCommand } = require('../server/switchbot-api');

test('コマンド入力を許可された形式だけに制限する', () => {
  assert.equal(validateCommand('turnOn', 'default'), true);
  assert.equal(validateCommand('brightnessDown', 'default'), true);
  assert.equal(validateCommand('setAll', '26,2,3,on'), true);
  assert.equal(validateCommand('setAll', '31,2,3,on'), false);
  assert.equal(validateCommand('setAll', '26,9,3,on'), false);
  assert.equal(validateCommand('customCommand', 'default'), false);
});

test('デバイス一覧に物理デバイスと赤外線リモコンを含め、未対応の状態 API は呼ばない', async () => {
  const calls = [];
  const axios = {
    async get(url) {
      calls.push(url);
      if (url.endsWith('/devices')) {
        return { data: { body: {
          deviceList: [
            { deviceId: 'meter-1', deviceName: 'Meter', deviceType: 'Meter' },
            { deviceId: 'cam-1', deviceName: 'Camera', deviceType: 'Indoor Cam' },
            { deviceId: 'hub-1', deviceName: 'Hub Mini', deviceType: 'Hub Mini' }
          ],
          infraredRemoteList: [
            { deviceId: 'ac-1', deviceName: 'AC', remoteType: 'Air Conditioner' },
            { deviceId: 'light-1', deviceName: 'Light', remoteType: 'Light' }
          ]
        } } };
      }
      return { data: { body: { temperature: 22, humidity: 50 } } };
    }
  };
  const api = createSwitchBotApi({ axios, token: 'token', secret: 'secret' });

  const devices = await api.getDevices();

  assert.equal(devices.length, 5);
  assert.deepEqual(devices[0].status, { temperature: 22, humidity: 50 });
  assert.deepEqual(devices[1].status, { camera: true, unsupported: true });
  assert.deepEqual(devices[2].status, { hub: true, unsupported: true });
  assert.equal(devices[3].deviceType, 'Air Conditioner');
  assert.equal(devices[3].isInfraredRemote, true);
  assert.equal(devices[4].deviceType, 'Light');
  assert.equal(calls.some(url => url.includes('cam-1/status')), false);
  assert.equal(calls.some(url => url.includes('hub-1/status')), false);
});

test('コマンドを SwitchBot API の形式で送信する', async () => {
  let posted;
  const axios = {
    async post(...args) {
      posted = args;
      return { data: { statusCode: 100, body: {} } };
    }
  };
  const api = createSwitchBotApi({ axios, token: 'token', secret: 'secret' });

  const result = await api.sendCommand('remote-1', 'setAll', '25,2,1,on');

  assert.equal(result.statusCode, 100);
  assert.equal(posted[0], 'https://api.switch-bot.com/v1.1/devices/remote-1/commands');
  assert.deepEqual(posted[1], {
    command: 'setAll', parameter: '25,2,1,on', commandType: 'command'
  });
});
