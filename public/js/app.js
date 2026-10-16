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
      plugins: { legend: { display: true, labels: { color: '#ccc', font: { size: 12 } } } },
      scales: { x: { display: false }, y: { display: true, ticks: { font: { size: 10 } } } }
    }
  });
}

async function loadDevices() {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const container = document.getElementById('devices');

  try {
    loading.style.display = 'block';
    error.hidden = true;

    const res = await fetch('/api/devices');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const devices = await res.json();
    if (!Array.isArray(devices)) throw new Error('Invalid device response');

    container.replaceChildren();

    devices.forEach(d => {
      const el = document.createElement('div');
      el.className = 'card';
      const s = d.status || {};
      const samples = addHistorySample(history, d.deviceId, s);

      const details = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'device-name';
      name.textContent = d.deviceName ?? 'Unknown device';
      details.appendChild(name);

      const deviceType = document.createElement('div');
      deviceType.className = 'device-type';
      deviceType.textContent = d.deviceType ?? '';
      details.appendChild(deviceType);

      const status = document.createElement('div');
      status.className = 'status';
      status.textContent = formatStatus(s);
      status.style.whiteSpace = 'pre-line';
      details.appendChild(status);

      if (s.temperature !== undefined && s.humidity !== undefined) {
        const graph = document.createElement('div');
        graph.className = 'card-graph';
        const canvas = document.createElement('canvas');
        graph.appendChild(canvas);
        el.append(details, graph);
        container.appendChild(el);
        createChart(canvas, samples);
      } else {
        status.classList.add('small');
        el.appendChild(details);
        container.appendChild(el);
      }
    });
  } catch (e) {
    console.error(e);
    error.textContent = 'デバイス情報を取得できませんでした。接続を確認して再試行します。';
    error.hidden = false;
  } finally {
    loading.style.display = 'none';
  }
}

const history = {};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatStatus, addHistorySample };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    loadDevices();
    setInterval(loadDevices, 5000);
  });
}
