const express = require('express');
const axios = require('axios');
const config = require('../config');
const { SHIPSTATION_PATHS } = require('../constants');

const router = express.Router();

let webhookEvents = [];
let sseClients = [];

function handle429(err, res) {
  if (err.response?.status === 429) {
    const retryAfter = err.response.headers['x-rate-limit-reset'] || 60;
    res.status(429).json({ error: 'rate_limited', retryAfter });
    return true;
  }
  return false;
}

function collectStringCandidates(value, out) {
  if (!value) return;
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStringCandidates(v, out);
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) collectStringCandidates(v, out);
  }
}

function normalizeToken(s) {
  return typeof s === 'string' ? s.trim().toLowerCase() : '';
}

function eventMatchesFilters(ev, filters) {
  const { trackingNumber, labelId, shipmentId, resourceId } = filters;
  const candidates = [];

  collectStringCandidates(ev?.eventType, candidates);
  collectStringCandidates(ev?.payload, candidates);

  const normalized = new Set(candidates.map(normalizeToken).filter(Boolean));

  function hasToken(token) {
    const t = normalizeToken(token);
    if (!t) return true;
    if (normalized.has(t)) return true;
    for (const cand of normalized) {
      if (cand.includes(t)) return true;
    }
    return false;
  }

  return hasToken(trackingNumber) && hasToken(labelId) && hasToken(shipmentId) && hasToken(resourceId);
}

function broadcastSse(event) {
  if (sseClients.length === 0) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const alive = [];

  for (const client of sseClients) {
    try {
      if (client.filters && !eventMatchesFilters(event, client.filters)) continue;
      client.res.write(data);
      alive.push(client);
    } catch {
      // drop dead connection
    }
  }

  sseClients = alive;
}

/**
 * POST /api/shipstation/webhooks/register
 *
 * NOTE: ShipStation sandbox/test environments may have limitations for webhooks.
 * We always forward registration in sandbox/live so you can see the real API behavior.
 *
 * mock: returns local simulated webhook_id
 */
router.post('/register', async (req, res, next) => {
  if (config.mode === 'mock') {
    const mockWebhookId = `se-mock-wh-${Date.now()}`;
    console.log(`[${new Date().toISOString()}] [MOCK] Register webhook: ${req.body.event} → ${req.body.url}`);
    return res.json({
      webhook_id: mockWebhookId,
      event: req.body.event,
      url: req.body.url,
      name: req.body.name,
    });
  }

  // sandbox/live mode
  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.WEBHOOKS}`;
    console.log(`[${new Date().toISOString()}] [${config.mode.toUpperCase()}] POST ${url}`, JSON.stringify(req.body));

    const response = await axios.post(url, req.body, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    res.json(response.data);
  } catch (err) {
    if (handle429(err, res)) return;
    next({ message: err.message, details: err.response?.data });
  }
});

/**
 * POST /api/shipstation/webhooks/receive
 * Local webhook listener — ShipStation calls this when events occur.
 * Always handled locally in all modes.
 */
router.post('/receive', (req, res) => {
  const timestamp = req.headers['x-shipstation-timestamp'];

  if (timestamp) {
    const eventTime = new Date(timestamp).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - eventTime > fiveMinutes) {
      return res.status(400).json({ error: 'Webhook timestamp too old' });
    }
  }

  const event = {
    receivedAt: new Date().toISOString(),
    eventType: req.body?.event || req.body?.resource_type || 'unknown',
    headers: {
      'x-shipstation-timestamp': timestamp || null,
      'content-type': req.headers['content-type'],
    },
    payload: req.body,
  };

  webhookEvents.unshift(event);
  if (webhookEvents.length > 20) {
    webhookEvents = webhookEvents.slice(0, 20);
  }

  console.log(`[${new Date().toISOString()}] Webhook received: ${event.eventType}`, JSON.stringify(req.body));
  broadcastSse(event);
  res.status(200).json({ received: true });
});

/**
 * GET /api/shipstation/webhooks/events
 * Optional filters:
 *   - tracking_number
 *   - label_id
 *   - shipment_id
 *   - resource_id
 */
router.get('/events', (req, res) => {
  const trackingNumber = typeof req.query?.tracking_number === 'string' ? req.query.tracking_number : '';
  const labelId = typeof req.query?.label_id === 'string' ? req.query.label_id : '';
  const shipmentId = typeof req.query?.shipment_id === 'string' ? req.query.shipment_id : '';
  const resourceId = typeof req.query?.resource_id === 'string' ? req.query.resource_id : '';

  const hasAnyFilter = Boolean(trackingNumber || labelId || shipmentId || resourceId);
  if (!hasAnyFilter) return res.json(webhookEvents);

  const filtered = webhookEvents.filter((ev) =>
    eventMatchesFilters(ev, { trackingNumber, labelId, shipmentId, resourceId })
  );
  res.json(filtered);
});

/**
 * GET /api/shipstation/webhooks/stream (SSE)
 * Optional filters:
 *   - tracking_number
 *   - label_id
 *   - shipment_id
 *   - resource_id
 */
router.get('/stream', (req, res) => {
  const trackingNumber = typeof req.query?.tracking_number === 'string' ? req.query.tracking_number : '';
  const labelId = typeof req.query?.label_id === 'string' ? req.query.label_id : '';
  const shipmentId = typeof req.query?.shipment_id === 'string' ? req.query.shipment_id : '';
  const resourceId = typeof req.query?.resource_id === 'string' ? req.query.resource_id : '';

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Initial comment so proxies start streaming immediately
  res.write(': connected\n\n');

  const client = {
    res,
    filters: { trackingNumber, labelId, shipmentId, resourceId },
  };
  sseClients.push(client);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // ignore; close handler will clean up
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c !== client);
  });
});

router.delete('/events', (req, res) => {
  webhookEvents = [];
  res.json({ cleared: true });
});

module.exports = router;
