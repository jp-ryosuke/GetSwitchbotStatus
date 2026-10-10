// public/js/app.js

async function loadDevices() {
  const loading = document.getElementById('loading');
  const container = document.getElementById('devices');

  try {
    loading.style.display = 'block';
    container.style.display = 'none';

    const res = await fetch('/api/devices');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const devices = await res.json();
    if (!Array.isArray(devices)) throw new Error('Invalid device response');

    const error = document.getElementById('error');
    if (error) error.hidden = true;

    container.replaceChildren();

    devices.forEach(d => {
      const el = document.createElement('div');
      el.className = 'card';

      const name = document.createElement('div');
      name.className = 'device-name';
      name.textContent = d.deviceName ?? 'Unknown device';

      const status = document.createElement('div');
      status.className = 'status';
      status.textContent = formatStatus(d);
      status.style.whiteSpace = 'pre-line';

      el.append(name, status);

      container.appendChild(el);
    });

  } catch (e) {
    console.error('loadDevices error:', e);
    let error = document.getElementById('error');
    if (!error) {
      error = document.createElement('div');
      error.id = 'error';
      error.setAttribute('role', 'alert');
      container.before(error);
    }
    error.textContent = 'デバイス情報を取得できませんでした。接続を確認して再試行します。';
    error.hidden = false;
  } finally {
    loading.style.display = 'none';
    container.style.display = 'grid';
  }
}

// ===== ステータス表示 =====
function formatStatus(d) {
  if (!d.status || d.status.error) {
    return 'Error retrieving status';
  }

  const s = d.status;
  const type = d.deviceType;

  switch (type) {

    // 温湿度計
    case 'Meter':
    case 'MeterPlus':
      return `🌡 ${s.temperature ?? '-'}℃\n💧 ${s.humidity ?? '-'}%\n🔋 ${s.battery ?? '-'}%`;

    // プラグ
    case 'Plug':
    case 'PlugMini':
      return `🔌 ${s.power ?? '-'}`;

    // ロック
    case 'Lock':
      return `🔐 ${s.lockState ?? '-'}\n🚪 ${s.doorState ?? '-'}\n🔋 ${s.battery ?? '-'}%`;

    // カメラ
    case 'Indoor Cam':
      return `📷 ${s.lastDetectionTime ?? 'N/A'}`;

    default:
      return JSON.stringify(s);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDevices();
});
