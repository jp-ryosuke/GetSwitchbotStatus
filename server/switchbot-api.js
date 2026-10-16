const axiosDefault = require('axios');
const crypto = require('crypto');

const API_BASE = 'https://api.switch-bot.com/v1.1';
const CAMERA_TYPES = new Set([
  'Indoor Cam', 'Pan/Tilt Cam', 'Pan/Tilt Cam 2K', 'Pan/Tilt Cam Plus 2K',
  'Pan/Tilt Cam Plus 3K', 'Video Doorbell'
]);
const HUBS_WITHOUT_STATUS = new Set([
  'Hub', 'Hub Plus', 'Hub Mini', 'Hub Mini2', 'Hub Mini 2', 'Hub Mini Matter Enabled'
]);

function validateCommand(command, parameter) {
  if (['turnOn', 'turnOff', 'brightnessUp', 'brightnessDown'].includes(command)) {
    return parameter === 'default';
  }
  return command === 'setAll'
    && typeof parameter === 'string'
    && /^(1[6-9]|2[0-9]|30),[0-5],[1-4],(on|off)$/.test(parameter);
}

function createSwitchBotApi({
  axios = axiosDefault,
  token = process.env.SWITCHBOT_TOKEN,
  secret = process.env.SWITCHBOT_SECRET,
  now = Date.now,
  randomUUID = crypto.randomUUID
} = {}) {
  function createHeaders() {
    const t = now().toString();
    const nonce = randomUUID();
    const sign = crypto.createHmac('sha256', secret)
      .update(token + t + nonce)
      .digest('base64');

    return {
      Authorization: token,
      sign,
      t,
      nonce,
      'Content-Type': 'application/json'
    };
  }

  async function getDevices() {
    const response = await axios.get(`${API_BASE}/devices`, {
      headers: createHeaders(),
      timeout: 3000
    });
    const body = response.data.body;
    const physicalDevices = await Promise.all((body.deviceList || []).map(async device => {
      if (CAMERA_TYPES.has(device.deviceType)) {
        return { ...device, status: { camera: true, unsupported: true } };
      }
      if (HUBS_WITHOUT_STATUS.has(device.deviceType)) {
        return { ...device, status: { hub: true, unsupported: true } };
      }
      try {
        const status = await axios.get(
          `${API_BASE}/devices/${encodeURIComponent(device.deviceId)}/status`,
          { headers: createHeaders(), timeout: 3000 }
        );
        return { ...device, status: status.data.body };
      } catch {
        return { ...device, status: { error: true } };
      }
    }));

    const infraredRemotes = (body.infraredRemoteList || []).map(remote => ({
      ...remote,
      deviceType: remote.remoteType,
      isInfraredRemote: true,
      status: {}
    }));
    return [...physicalDevices, ...infraredRemotes];
  }

  async function sendCommand(deviceId, command, parameter = 'default') {
    if (!validateCommand(command, parameter)) {
      const error = new Error('unsupported command or invalid parameter');
      error.statusCode = 400;
      throw error;
    }
    const response = await axios.post(
      `${API_BASE}/devices/${encodeURIComponent(deviceId)}/commands`,
      { command, parameter, commandType: 'command' },
      { headers: createHeaders(), timeout: 5000 }
    );
    return response.data;
  }

  return { getDevices, sendCommand };
}

module.exports = { createSwitchBotApi, validateCommand, CAMERA_TYPES, HUBS_WITHOUT_STATUS };
