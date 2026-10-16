// デバイス状態の表示文字列を作る純粋関数。
function formatStatus(status) {
  const s = status || {};
  if (s.error) return 'Error retrieving status';

  if (s.temperature !== undefined && s.humidity !== undefined) {
    return `🌡 ${s.temperature}℃\n💧 ${s.humidity}%\n🔋 ${s.battery ?? '-'}%`;
  }

  const lines = [];
  if (s.lockState) lines.push(`🔐 ${s.lockState}`);
  if (s.doorState) lines.push(`🚪 ${s.doorState}`);
  if (s.power) lines.push(`🔌 ${s.power}`);
  if (s.lastDetectionTime) lines.push(`📷 ${s.lastDetectionTime}`);
  if (s.battery !== undefined) lines.push(`🔋 ${s.battery}%`);
  return lines.join('\n') || 'No Data';
}

// 温湿度の履歴をデバイスごとに最大30件保持する。
function addHistorySample(history, deviceId, status, limit = 30) {
  if (status?.temperature === undefined || status?.humidity === undefined) {
    return history[deviceId] || [];
  }

  const samples = history[deviceId] || (history[deviceId] = []);
  samples.push({ t: status.temperature, h: status.humidity });
  if (samples.length > limit) samples.splice(0, samples.length - limit);
  return samples;
}

function createChart(canvas, data) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map(() => ''),
      datasets: [
        {
          label: 'Temperature (℃)', data: data.map(d => d.t),
          borderColor: '#ff7043', backgroundColor: '#ff7043', borderWidth: 2, tension: 0.3
        },
        {
          label: 'Humidity (%)', data: data.map(d => d.h),
          borderColor: '#42a5f5', backgroundColor: '#42a5f5', borderWidth: 2, tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: true, labels: { color: '#ccc', font: { size: 12 } } } },
      scales: { x: { display: false }, y: { display: true, ticks: { font: { size: 10 } } } }
    }
  });
}

const history = {};
const cards = new Map();
let requestInProgress = false;
const lightDeviceTypes = new Set([
  'Light', 'Color Bulb', 'Strip Light', 'Strip Light 3', 'Ceiling Light', 'Ceiling Light Pro',
  'Floor Lamp', 'RGBICWW Floor Lamp', 'RGBICWW Strip Light', 'RGBIC Neon Rope Light',
  'RGBIC Neon Wire Rope Light', 'Permanent Outdoor Lights', 'RGBICWW Ceiling Light', 'Candle Warmer Lamp'
]);

function createDeviceCard() {
  const el = document.createElement('details');
  el.className = 'card';
  const summary = document.createElement('summary');
  const details = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'device-name';
  details.appendChild(name);

  const deviceType = document.createElement('div');
  deviceType.className = 'device-type';
  details.appendChild(deviceType);

  const status = document.createElement('div');
  status.className = 'status';
  status.style.whiteSpace = 'pre-line';
  details.appendChild(status);
  summary.appendChild(details);

  const graph = document.createElement('div');
  graph.className = 'card-graph';
  const canvas = document.createElement('canvas');
  graph.appendChild(canvas);
  graph.hidden = true;

  const controls = document.createElement('div');
  controls.className = 'card-details';
  const message = document.createElement('div');
  message.className = 'action-message';
  message.setAttribute('aria-live', 'polite');
  controls.appendChild(message);

  el.append(summary, graph, controls);
  const card = { el, name, deviceType, status, graph, canvas, chart: null, controls, message };
  el.addEventListener('toggle', () => card.chart?.resize());
  return card;
}

function makeButton(label, onClick, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = className;
  button.addEventListener('click', () => onClick(button));
  return button;
}

async function sendDeviceCommand(card, device, command, parameter = 'default', button) {
  if (button) button.disabled = true;
  card.message.textContent = '送信中…';
  try {
    const response = await fetch(`/api/devices/${encodeURIComponent(device.deviceId)}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, parameter })
    });
    const result = await response.json();
    if (!response.ok || result.statusCode !== 100) {
      throw new Error(result.error || result.message || 'コマンドを送信できませんでした');
    }
    card.message.textContent = 'コマンドを送信しました';
  } catch (error) {
    card.message.textContent = `操作に失敗しました: ${error.message}`;
  } finally {
    if (button) button.disabled = false;
  }
}

function buildControls(card, device) {
  const type = device.deviceType || device.remoteType || '';
  const actions = document.createElement('div');
  actions.className = 'device-controls';

  if (type === 'Air Conditioner') {
    const settings = document.createElement('div');
    settings.className = 'ac-settings';

    const temperatureLabel = document.createElement('label');
    temperatureLabel.textContent = '設定温度';
    const temperature = document.createElement('input');
    temperature.type = 'number';
    temperature.min = '16';
    temperature.max = '30';
    temperature.value = '26';
    temperatureLabel.append(temperature, document.createTextNode(' ℃'));

    const modeLabel = document.createElement('label');
    modeLabel.textContent = '運転モード';
    const mode = document.createElement('select');
    [['0', '自動'], ['2', '冷房'], ['3', '除湿'], ['4', '送風'], ['5', '暖房']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      mode.appendChild(option);
    });
    mode.value = '2';
    modeLabel.appendChild(mode);

    const fanLabel = document.createElement('label');
    fanLabel.textContent = '風量';
    const fan = document.createElement('select');
    [['1', '自動'], ['2', '弱'], ['3', '中'], ['4', '強']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      fan.appendChild(option);
    });
    fan.value = '1';
    fanLabel.appendChild(fan);

    card.acTemperature = temperature;
    card.acMode = mode;
    card.acFan = fan;
    settings.append(temperatureLabel, modeLabel, fanLabel);
    card.controls.insertBefore(settings, card.message);
  }

  if (type !== 'Air Conditioner' && ((device.isInfraredRemote && type !== 'Others') || lightDeviceTypes.has(type) || ['Plug', 'Plug Mini', 'Plug Mini (JP)', 'Plug Mini (US)', 'Plug Mini (EU)', 'Bot'].includes(type))) {
    actions.append(
      makeButton('電源 ON', button => sendDeviceCommand(card, device, 'turnOn', 'default', button), 'primary-button'),
      makeButton('電源 OFF', button => sendDeviceCommand(card, device, 'turnOff', 'default', button))
    );
  }

  if (type === 'Air Conditioner') {
    actions.append(
      makeButton('設定を送信', button => {
        const value = Number(card.acTemperature.value);
        if (!Number.isInteger(value) || value < 16 || value > 30) {
          card.message.textContent = '設定温度は16〜30℃で指定してください';
          return;
        }
        sendDeviceCommand(card, device, 'setAll', `${value},${card.acMode.value},${card.acFan.value},on`, button);
      }, 'primary-button'),
      makeButton('エアコン OFF', button => {
        const value = Number(card.acTemperature.value);
        const setting = Number.isInteger(value) && value >= 16 && value <= 30 ? value : 26;
        sendDeviceCommand(card, device, 'setAll', `${setting},${card.acMode.value},${card.acFan.value},off`, button);
      })
    );
  }

  if (type === 'Light') {
    actions.append(
      makeButton('明るくする', button => sendDeviceCommand(card, device, 'brightnessUp', 'default', button)),
      makeButton('暗くする', button => sendDeviceCommand(card, device, 'brightnessDown', 'default', button))
    );
  }

  if (actions.childElementCount) card.controls.insertBefore(actions, card.message);
  if (type.startsWith('Indoor Cam') || type.includes('Cam') || type === 'Video Doorbell') {
    const note = document.createElement('p');
    note.className = 'camera-note';
    note.textContent = 'カメラ状態や録画一覧を取得する Open API はありません。公開 HTTPS の /api/webhooks/switchbot を SwitchBot Webhook に登録すると、届いたイベントを表示します。画像はイベントに URL が含まれる場合のみ表示します。';
    card.controls.insertBefore(note, card.message);
    const eventList = document.createElement('div');
    eventList.className = 'camera-events';
    card.controls.insertBefore(eventList, card.message);
    card.eventList = eventList;
  }

  if (!actions.childElementCount && !card.eventList && !type.startsWith('Hub')) {
    const note = document.createElement('p');
    note.className = 'camera-note';
    note.textContent = 'デバイス情報と状態を表示しています。';
    card.controls.insertBefore(note, card.message);
  }

  const metadata = document.createElement('div');
  metadata.className = 'device-metadata';
  metadata.textContent = `デバイス ID: ${device.deviceId}`;
  if (device.hubDeviceId && !device.hubDeviceId.startsWith('000000')) {
    metadata.appendChild(document.createElement('br'));
    metadata.appendChild(document.createTextNode(`中継ハブ ID: ${device.hubDeviceId}`));
    if (device.hubName) metadata.appendChild(document.createTextNode(`（${device.hubName}）`));
  }
  if (type.startsWith('Hub')) {
    const remotes = device.connectedRemotes || [];
    metadata.appendChild(document.createElement('br'));
    metadata.appendChild(document.createTextNode(`登録済み赤外線リモコン: ${remotes.length} 台`));
    if (remotes.length) {
      const list = document.createElement('ul');
      remotes.forEach(remote => {
        const item = document.createElement('li');
        item.textContent = `${remote.deviceName}（${remote.deviceType}）`;
        list.appendChild(item);
      });
      metadata.appendChild(list);
    }
    const hubNote = document.createElement('p');
    hubNote.textContent = 'Hub Mini の Open API では一覧情報とリモコンとの紐付けを確認できます。オンライン状態や Wi-Fi 情報は取得できません。';
    metadata.appendChild(hubNote);
  }
  card.controls.insertBefore(metadata, card.message);
}

function renderCameraEvents(card, events) {
  if (!card.eventList) return;
  const signature = JSON.stringify(events);
  if (card.lastCameraEvents === signature) return;
  card.lastCameraEvents = signature;
  card.eventList.replaceChildren();
  if (!events.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Webhook イベントはまだありません';
    card.eventList.appendChild(empty);
    return;
  }

  events.forEach(event => {
    const item = document.createElement('article');
    item.className = 'camera-event';
    const time = document.createElement('time');
    const timestamp = Number(event.timeOfSample);
    time.dateTime = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp).toISOString();
    time.textContent = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp).toLocaleString();
    const state = document.createElement('div');
    state.textContent = event.detectionState || 'Motion detected';
    item.append(time, state);
    if (event.imageUrl) {
      const image = document.createElement('img');
      image.src = event.imageUrl;
      image.alt = '動体検知時の画像';
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      item.appendChild(image);
    }
    card.eventList.appendChild(item);
  });
}

async function refreshCameraEvents(device, card) {
  if (!card.eventList) return;
  const query = new URLSearchParams({ deviceId: device.deviceId });
  try {
    const response = await fetch(`/api/camera-events?${query}`);
    if (response.ok) renderCameraEvents(card, await response.json());
  } catch (error) {
    console.error('camera event refresh error:', error);
  }
}

function updateDeviceCard(card, device) {
  const status = device.status || {};
  const isMeter = status.temperature !== undefined && status.humidity !== undefined;

  card.name.textContent = device.deviceName ?? 'Unknown device';
  card.deviceType.textContent = device.deviceType ?? '';
  if (status.camera) {
    card.status.textContent = 'カメラ情報（Webhook 対応）';
  } else if (status.hub) {
    card.status.textContent = `赤外線リモコン ${device.connectedRemotes?.length || 0} 台を中継`;
  } else {
    card.status.textContent = formatStatus(status);
  }
  card.status.classList.toggle('small', !isMeter);
  card.graph.hidden = !isMeter;

  if (!isMeter) return;

  const samples = addHistorySample(history, device.deviceId, status);
  if (!card.chart) {
    card.chart = createChart(card.canvas, samples);
    return;
  }

  card.chart.data.labels = samples.map(() => '');
  card.chart.data.datasets[0].data = samples.map(sample => sample.t);
  card.chart.data.datasets[1].data = samples.map(sample => sample.h);
  card.chart.update('none');
}

async function loadDevices() {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const container = document.getElementById('devices');

  if (requestInProgress) return;
  requestInProgress = true;

  try {
    error.hidden = true;

    const res = await fetch('/api/devices');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const devices = await res.json();
    if (!Array.isArray(devices)) throw new Error('Invalid device response');

    const hubsById = new Map(devices
      .filter(device => device.deviceType?.startsWith('Hub'))
      .map(device => [device.deviceId, device]));
    devices.forEach(device => {
      if (device.deviceType?.startsWith('Hub')) {
        device.connectedRemotes = devices.filter(remote =>
          remote.isInfraredRemote && remote.hubDeviceId === device.deviceId
        );
      } else if (device.isInfraredRemote) {
        device.hubName = hubsById.get(device.hubDeviceId)?.deviceName;
      }
    });

    const currentIds = new Set();
    const cameraEventRefreshes = [];
    devices.forEach(device => {
      const id = String(device.deviceId);
      currentIds.add(id);

      let card = cards.get(id);
      if (!card) {
        card = createDeviceCard();
        cards.set(id, card);
        container.appendChild(card.el);
        buildControls(card, device);
      }
      updateDeviceCard(card, device);
      if (card.eventList) cameraEventRefreshes.push(refreshCameraEvents(device, card));
    });

    await Promise.all(cameraEventRefreshes);

    for (const [id, card] of cards) {
      if (!currentIds.has(id)) {
        card.chart?.destroy();
        card.el.remove();
        cards.delete(id);
        delete history[id];
      }
    }
  } catch (e) {
    console.error(e);
    error.textContent = 'デバイス情報を取得できませんでした。接続を確認して再試行します。';
    error.hidden = false;
  } finally {
    loading.style.display = 'none';
    requestInProgress = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatStatus, addHistorySample };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    loadDevices();
    setInterval(loadDevices, 5000);
  });
}
