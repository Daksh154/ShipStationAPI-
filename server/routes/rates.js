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
 * POST /api/shipstation/rates
 *
 * sandbox/live: calls ShipStation POST /v2/rates/estimate
 *   Response shape: { rate_response: { rates: [...] } }
 *   Each rate: { rate_id, carrier_id, carrier_code, carrier_friendly_name, service_code,
 *               service_type, shipping_amount: { currency, amount }, delivery_days, ... }
 * mock: returns 3 hardcoded USPS-style rates
 */
router.post('/', async (req, res, next) => {
  if (config.mode === 'mock') {
    const carrierIds = req.body.carrier_ids || ['se-mock-usps'];
    console.log(`[${new Date().toISOString()}] [MOCK] Rate estimate for carriers: ${carrierIds.join(', ')}`);
    return res.json({
      rate_response: {
        rates: [
          {
            rate_id: 'se-rate-mock-001',
            rate_type: 'shipment',
            carrier_id: carrierIds[0],
            carrier_code: 'stamps_com',
            carrier_friendly_name: 'USPS',
            service_code: 'usps_priority_mail',
            service_type: 'USPS Priority Mail',
            shipping_amount: { currency: 'usd', amount: 8.40 },
            delivery_days: 2,
            estimated_delivery_date: new Date(Date.now() + 2 * 86400000).toISOString(),
          },
          {
            rate_id: 'se-rate-mock-002',
            rate_type: 'shipment',
            carrier_id: carrierIds[0],
            carrier_code: 'stamps_com',
            carrier_friendly_name: 'USPS',
            service_code: 'usps_first_class_mail',
            service_type: 'USPS First Class Mail',
            shipping_amount: { currency: 'usd', amount: 4.20 },
            delivery_days: 5,
            estimated_delivery_date: new Date(Date.now() + 5 * 86400000).toISOString(),
          },
          {
            rate_id: 'se-rate-mock-003',
            rate_type: 'shipment',
            carrier_id: carrierIds[0],
            carrier_code: 'stamps_com',
            carrier_friendly_name: 'USPS',
            service_code: 'usps_priority_mail_express',
            service_type: 'USPS Priority Mail Express',
            shipping_amount: { currency: 'usd', amount: 26.35 },
            delivery_days: 1,
            estimated_delivery_date: new Date(Date.now() + 1 * 86400000).toISOString(),
          },
        ],
      },
    });
  }

  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.RATES_ESTIMATE}`;
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

module.exports = router;
