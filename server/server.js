// server/server.js

require('dotenv').config();

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();

// ===== 環境変数 =====
const TOKEN = process.env.SWITCHBOT_TOKEN;
const SECRET = process.env.SWITCHBOT_SECRET;
const PORT = process.env.PORT || 3000;

// ===== 静的ファイル配信 =====
app.use(express.static(path.join(__dirname, '../public')));

// ===== 署名付きヘッダ生成 =====
function createHeaders() {
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();

  const data = TOKEN + t + nonce;

  const sign = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64');

  return {
    Authorization: TOKEN,
    sign: sign,
    t: t,
    nonce: nonce,
    'Content-Type': 'application/json'
  };
}

// ===== デバイス一覧 + ステータス =====
app.get('/api/devices', async (req, res) => {
  try {
    const list = await axios.get(
      'https://api.switch-bot.com/v1.1/devices',
      {
        headers: createHeaders(),
        timeout: 3000
      }
    );

    const devices = list.data.body.deviceList;

    const results = await Promise.all(
      devices.map(async (d) => {
        try {
          const status = await axios.get(
            `https://api.switch-bot.com/v1.1/devices/${d.deviceId}/status`,
            {
              headers: createHeaders(),
              timeout: 3000
            }
          );

          return {
            ...d,
            status: status.data.body
          };

        } catch (e) {
          return {
            ...d,
            status: { error: true }
          };
        }
      })
    );

    res.json(results);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'failed to fetch devices' });
  }
});

// ===== サーバ起動 =====
app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
