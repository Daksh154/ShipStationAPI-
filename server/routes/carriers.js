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
 * GET /api/shipstation/carriers
 *
 * sandbox/live: calls ShipStation GET /v2/carriers — returns real carrier accounts
 *   connected to your ShipStation account
 * mock: returns 3 hardcoded carrier stubs
 */
router.get('/', async (req, res, next) => {
  if (config.mode === 'mock') {
    console.log(`[${new Date().toISOString()}] [MOCK] List carriers`);
    return res.json({
      carriers: [
        {
          carrier_id: 'se-mock-usps',
          carrier_code: 'stamps_com',
          friendly_name: 'USPS',
          services: [
            { service_code: 'usps_priority_mail', name: 'USPS Priority Mail' },
            { service_code: 'usps_first_class_mail', name: 'USPS First Class Mail' },
            { service_code: 'usps_priority_mail_express', name: 'USPS Priority Express' },
          ],
        },
        {
          carrier_id: 'se-mock-ups',
          carrier_code: 'ups',
          friendly_name: 'UPS',
          services: [
            { service_code: 'ups_ground', name: 'UPS Ground' },
            { service_code: 'ups_next_day_air', name: 'UPS Next Day Air' },
          ],
        },
        {
          carrier_id: 'se-mock-fedex',
          carrier_code: 'fedex',
          friendly_name: 'FedEx',
          services: [
            { service_code: 'fedex_ground', name: 'FedEx Ground' },
            { service_code: 'fedex_2day', name: 'FedEx 2Day' },
          ],
        },
      ],
    });
  }

  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.CARRIERS}`;
    console.log(`[${new Date().toISOString()}] [${config.mode.toUpperCase()}] GET ${url}`);

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
