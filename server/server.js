require('dotenv').config();

const express = require('express');
const path = require('path');
const { createSwitchBotApi } = require('./switchbot-api');
const { createDeviceRouter } = require('./routes/devices');
const { createCameraEventStore, createCameraEventsRouter } = require('./routes/camera-events');

function createApp({ switchBotApi = createSwitchBotApi(), cameraEventStore = createCameraEventStore() } = {}) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/api/devices', createDeviceRouter(switchBotApi));
  app.use('/api', createCameraEventsRouter(cameraEventStore));
  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    console.log(`Server running: http://localhost:${port}`);
  });
}

module.exports = { createApp };
