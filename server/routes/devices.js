const express = require('express');
const { validateCommand } = require('../switchbot-api');

function createGetDevicesHandler(switchBotApi) {
  return async (req, res) => {
    try {
      res.json(await switchBotApi.getDevices());
    } catch (error) {
      console.error(error.response?.data || error.message);
      res.status(500).json({ error: 'failed to fetch devices' });
    }
  };
}

function createSendCommandHandler(switchBotApi) {
  return async (req, res) => {
    const { command, parameter = 'default' } = req.body || {};
    if (!validateCommand(command, parameter)) {
      return res.status(400).json({ error: 'unsupported command or invalid parameter' });
    }
    try {
      res.json(await switchBotApi.sendCommand(req.params.deviceId, command, parameter));
    } catch (error) {
      console.error(error.response?.data || error.message);
      res.status(error.statusCode || 502).json({
        error: error.response?.data?.message || 'failed to send command'
      });
    }
  };
}

function createDeviceRouter(switchBotApi) {
  const router = express.Router();
  router.get('/', createGetDevicesHandler(switchBotApi));
  router.post('/:deviceId/commands', createSendCommandHandler(switchBotApi));

  return router;
}

module.exports = { createDeviceRouter, createGetDevicesHandler, createSendCommandHandler };
