const express = require('express');
const axios = require('axios');
const config = require('../config');
const { SHIPSTATION_PATHS } = require('../constants');

const router = express.Router();

function handle429(err, res) {
  if (err.response?.status === 429) {
    const retryAfter = err.response.headers['x-rate-limit-reset'] || 60;
    res.status(429).json({ error: 'rate_limited', retryAfter });
    return true;
  }
  return false;
}

/**
 * POST /api/shipstation/label/create
 * Creates a label. If rate_id is supplied uses POST /v2/labels/rates/:rate_id,
 * otherwise POST /v2/labels with full shipment payload.
 */
router.post('/create', async (req, res, next) => {
  const {
    rate_id,
    carrier_id,
    service_code,
    ship_from,
    ship_to,
    packages,
    label_format,
    label_layout,
  } = req.body;

  try {
    const requestedTestLabel =
      typeof req.body?.test_label === 'boolean'
        ? req.body.test_label
        : typeof req.body?.testLabel === 'boolean'
          ? req.body.testLabel
          : null;

    const payload = {
      test_label: requestedTestLabel ?? true,
      validate_address: 'validate_and_clean',
      shipment: { carrier_id, service_code, ship_from, ship_to, packages },
      label_format: label_format || 'pdf',
      label_layout: label_layout || '4x6',
    };

    const url = rate_id
      ? `${config.baseUrl}${SHIPSTATION_PATHS.LABELS_FROM_RATE(rate_id)}`
      : `${config.baseUrl}${SHIPSTATION_PATHS.LABELS}`;

    console.log(`[${new Date().toISOString()}] POST ${url}`, JSON.stringify(rate_id ? { ...payload, rate_id } : payload));

    const response = await axios.post(url, payload, {
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

router.put('/:label_id/void', async (req, res, next) => {
  const { label_id } = req.params;
  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.LABEL_VOID(label_id)}`;
    console.log(`[${new Date().toISOString()}] PUT ${url}`);
    const response = await axios.put(url, {}, {
      headers: { 'api-key': config.apiKey },
    });
    res.json(response.data);
  } catch (err) {
    if (handle429(err, res)) return;
    next({ message: err.message, details: err.response?.data });
  }
});

router.get('/:label_id/track', async (req, res, next) => {
  const { label_id } = req.params;
  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.LABEL_TRACK(label_id)}`;
    console.log(`[${new Date().toISOString()}] GET ${url}`);
    const response = await axios.get(url, {
      headers: { 'api-key': config.apiKey },
    });
    res.json(response.data);
  } catch (err) {
    if (handle429(err, res)) return;
    next({ message: err.message, details: err.response?.data });
  }
});

module.exports = router;
