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

router.post('/', async (req, res, next) => {
  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.SHIPMENTS}`;
    console.log(`[${new Date().toISOString()}] POST ${url}`, JSON.stringify(req.body));
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

router.get('/:shipment_id/rates', async (req, res, next) => {
  const { shipment_id } = req.params;
  const carrierId = typeof req.query?.carrier_id === 'string' ? req.query.carrier_id : null;

  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.SHIPMENT_RATES(shipment_id)}`;
    console.log(`[${new Date().toISOString()}] GET ${url}`);
    const response = await axios.get(url, {
      headers: { 'api-key': config.apiKey },
    });

    const rates = response.data?.rates;
    if (Array.isArray(rates) && rates.length > 0) {
      return res.json(response.data);
    }

    // Fallback: when shipment rates return empty, recalculate via POST /v2/rates
    if (!carrierId) {
      return res.json(response.data);
    }

    const calcUrl = `${config.baseUrl}${SHIPSTATION_PATHS.RATES}`;
    const calcBody = { shipment_id, rate_options: { carrier_ids: [carrierId] } };
    console.log(`[${new Date().toISOString()}] POST ${calcUrl}`, JSON.stringify(calcBody));

    const calcResponse = await axios.post(calcUrl, calcBody, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
    return res.json(calcResponse.data);
  } catch (err) {
    if (handle429(err, res)) return;
    next({ message: err.message, details: err.response?.data });
  }
});

module.exports = router;
