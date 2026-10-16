const express = require('express');

function normalizeId(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function createCameraEventStore({ limit = 100, now = Date.now } = {}) {
  const events = [];

  function add(payload) {
    const context = payload?.context;
    if (!context || typeof context !== 'object' || !context.deviceMac) {
      return false;
    }
    const candidate = context.motionEvent?.img || context.img || context.imageUrl;
    const imageUrl = typeof candidate === 'string' && candidate.startsWith('https://')
      ? candidate
      : null;
    const receivedAt = now();
    events.unshift({
      id: `${context.deviceMac}-${context.timeOfSample || receivedAt}`,
      deviceMac: context.deviceMac,
      deviceType: context.deviceType || 'Camera',
      eventType: payload.eventType || 'changeReport',
      detectionState: context.motionEvent?.detectionType || context.detectionState || 'Motion detected',
      timeOfSample: context.motionEvent?.eventTime || context.timeOfSample || receivedAt,
      receivedAt,
      imageUrl
    });
    if (events.length > limit) events.length = limit;
    return true;
  }

  function list(deviceId) {
    if (!deviceId) return [...events];
    const id = normalizeId(deviceId);
    return events.filter(event => normalizeId(event.deviceMac) === id);
  }

  return { add, list };
}

function createReceiveCameraEventHandler(eventStore) {
  return (req, res) => {
    if (!eventStore.add(req.body)) {
      return res.status(400).json({ error: 'invalid SwitchBot webhook event' });
    }
    res.sendStatus(200);
  };
}

function createListCameraEventsHandler(eventStore) {
  return (req, res) => {
    res.json(eventStore.list(req.query.deviceId));
  };
}

function createCameraEventsRouter(eventStore) {
  const router = express.Router();
  router.post('/webhooks/switchbot', createReceiveCameraEventHandler(eventStore));
  router.get('/camera-events', createListCameraEventsHandler(eventStore));

  return router;
}

module.exports = {
  createCameraEventStore,
  createCameraEventsRouter,
  createReceiveCameraEventHandler,
  createListCameraEventsHandler,
  normalizeId
};
