// public/js/app.js

async function loadDevices() {
  const loading = document.getElementById('loading');
  const container = document.getElementById('devices');

  try {
    loading.style.display = 'block';
    container.style.display = 'none';

    const res = await fetch('/api/devices');
    const devices = await res.json();

    container.innerHTML = '';

    devices.forEach(d => {
      const el = document.createElement('div');
      el.className = 'card';

      el.innerHTML = `
        <div class="device-name">${d.deviceName}</div>
        <div class="status">${formatStatus(d)}</div>
      `;

      container.appendChild(el);
    });

  } catch (e) {
    console.error('loadDevices error:', e);
  } finally {
    loading.style.display = 'none';
    container.style.display = 'grid';
  }
}

// ===== ステータス表示 =====
function formatStatus(d) {
  if (!d.status || d.status.error) {
    return `<span class="ng">Error</span>`;
  }

  const s = d.status;
  const type = d.deviceType;

  switch (type) {

    // 温湿度計
    case 'Meter':
    case 'MeterPlus':
      return `
        🌡 ${s.temperature ?? '-'}℃<br>
        💧 ${s.humidity ?? '-'}%<br>
        🔋 ${s.battery ?? '-'}%
      `;

    // プラグ
    case 'Plug':
    case 'PlugMini':
      return `
        🔌 <span class="${s.power === 'on' ? 'ok' : 'warn'}">
        ${s.power ?? '-'}
        </span>
      `;

    // ロック
    case 'Lock':
      return `
        🔐 ${s.lockState ?? '-'}<br>
        🚪 ${s.doorState ?? '-'}<br>
        🔋 ${s.battery ?? '-'}%
      `;

    // カメラ
    case 'Indoor Cam':
      return `
        📷 ${s.lastDetectionTime ?? 'N/A'}
      `;

    default:
      return JSON.stringify(s);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDevices();
});
