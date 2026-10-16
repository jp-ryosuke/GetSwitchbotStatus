const test = require('node:test');
const assert = require('node:assert/strict');
const { formatStatus, addHistorySample } = require('../public/js/app.js');

test('温湿度計のステータスを表示用の複数行テキストにする', () => {
  assert.equal(
    formatStatus({ temperature: 22.5, humidity: 48, battery: 90 }),
    '🌡 22.5℃\n💧 48%\n🔋 90%'
  );
});

test('温湿度計で値が欠けているときは既定値を表示する', () => {
  assert.equal(
    formatStatus({ temperature: 20, humidity: 50 }),
    '🌡 20℃\n💧 50%\n🔋 -%'
  );
});

test('ロックの状態を表示する', () => {
  assert.equal(
    formatStatus({ lockState: 'locked', doorState: 'closed', battery: 75 }),
    '🔐 locked\n🚪 closed\n🔋 75%'
  );
});

test('プラグの電源状態を表示する', () => {
  assert.equal(formatStatus({ power: 'on' }), '🔌 on');
});

test('状態が取得できない場合とデータがない場合を区別する', () => {
  assert.equal(formatStatus({ error: true }), 'Error retrieving status');
  assert.equal(formatStatus({}), 'No Data');
  assert.equal(formatStatus(null), 'No Data');
});

test('温湿度の履歴をデバイスごとに追加する', () => {
  const history = {};
  const result = addHistorySample(history, 'meter-1', { temperature: 21, humidity: 45 });

  assert.deepEqual(result, [{ t: 21, h: 45 }]);
  assert.equal(history['meter-1'], result);
});

test('不完全な温湿度データは履歴に追加しない', () => {
  const history = { 'meter-1': [{ t: 20, h: 40 }] };
  const result = addHistorySample(history, 'meter-1', { temperature: 21 });

  assert.deepEqual(result, [{ t: 20, h: 40 }]);
});

test('温湿度の履歴は最新30件を保持する', () => {
  const history = {};
  for (let temperature = 0; temperature < 32; temperature += 1) {
    addHistorySample(history, 'meter-1', { temperature, humidity: temperature + 10 });
  }

  assert.equal(history['meter-1'].length, 30);
  assert.deepEqual(history['meter-1'][0], { t: 2, h: 12 });
  assert.deepEqual(history['meter-1'][29], { t: 31, h: 41 });
});
