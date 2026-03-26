const express = require('express');
const axios = require('axios');
const config = require('../config');
const { SHIPENGINE_PATHS } = require('../constants');

const router = express.Router();

let webhookEvents = [];

function handle429(err, res) {
  if (err.response?.status === 429) {
    const retryAfter = err.response.headers['x-rate-limit-reset'] || 60;
    res.status(429).json({ error: 'rate_limited', retryAfter });
    return true;
  }
  return false;
}

/**
 * POST /api/shipstation/webhooks/register
 *
 * NOTE: ShipEngine sandbox does NOT support webhooks.
 * This endpoint will return an error in sandbox mode from ShipEngine's side.
 * The UI will show a clear message explaining this limitation.
 * In live mode, this calls ShipEngine POST /v1/environment/webhooks.
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

  if (config.mode === 'sandbox') {
    console.log(`[${new Date().toISOString()}] [SANDBOX] Webhooks not supported in sandbox — returning informational response`);
    return res.status(400).json({
      error: 'sandbox_limitation',
      message: 'ShipEngine sandbox does not support webhook registration. Switch to MODE=live with a production API key to test webhooks.',
    });
  }

  // live mode
  try {
    const url = `${config.baseUrl}${SHIPENGINE_PATHS.WEBHOOKS}`;
    console.log(`[${new Date().toISOString()}] [LIVE] POST ${url}`, JSON.stringify(req.body));

    const response = await axios.post(url, req.body, {
      headers: {
        'API-Key': config.apiKey,
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
 * Local webhook listener — ShipEngine calls this when events occur.
 * Always handled locally in all modes.
 */
router.post('/receive', (req, res) => {
  const timestamp = req.headers['x-shipengine-timestamp'];

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
      'x-shipengine-timestamp': timestamp || null,
      'content-type': req.headers['content-type'],
    },
    payload: req.body,
  };

  webhookEvents.unshift(event);
  if (webhookEvents.length > 20) {
    webhookEvents = webhookEvents.slice(0, 20);
  }

  console.log(`[${new Date().toISOString()}] Webhook received: ${event.eventType}`, JSON.stringify(req.body));
  res.status(200).json({ received: true });
});

router.get('/events', (req, res) => {
  res.json(webhookEvents);
});

router.delete('/events', (req, res) => {
  webhookEvents = [];
  res.json({ cleared: true });
});

module.exports = router;
