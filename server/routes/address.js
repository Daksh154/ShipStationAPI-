const express = require('express');
const axios = require('axios');
const config = require('../config');
const { SHIPENGINE_PATHS } = require('../constants');

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
 * POST /api/shipstation/address/validate
 *
 * sandbox/live: calls ShipEngine POST /v1/addresses/validate — real validation with USPS/carrier data
 * mock: returns local verified response (no network call)
 *
 * ShipEngine expects an array of addresses and returns:
 *   [{ status: 'verified'|'warning'|'error', matched_address: {...}, messages: [...] }]
 */
router.post('/validate', async (req, res, next) => {
  if (config.mode === 'mock') {
    const input = Array.isArray(req.body) ? req.body[0] : req.body;
    console.log(`[${new Date().toISOString()}] [MOCK] Address validate:`, JSON.stringify(input));
    return res.json([
      {
        status: 'verified',
        matched_address: {
          name: input.name || '',
          address_line1: input.address_line1 || '',
          address_line2: input.address_line2 || '',
          city_locality: input.city_locality || '',
          state_province: input.state_province || '',
          postal_code: input.postal_code || '',
          country_code: input.country_code || 'US',
          phone: input.phone || '',
        },
        messages: [],
      },
    ]);
  }

  try {
    const body = Array.isArray(req.body) ? req.body : [req.body];
    const url = `${config.baseUrl}${SHIPENGINE_PATHS.ADDRESS_VALIDATE}`;
    console.log(`[${new Date().toISOString()}] [${config.mode.toUpperCase()}] POST ${url}`);

    const response = await axios.post(url, body, {
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

module.exports = router;
