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
 * POST /api/shipstation/shipments
 *
 * sandbox/live: calls ShipStation POST /v2/shipments
 * mock: returns a local shipment_id and echoes minimal fields
 */
router.post('/', async (req, res, next) => {
  if (config.mode === 'mock') {
    const shipment_id = `se-mock-shipment-${Date.now()}`;
    console.log(`[${new Date().toISOString()}] [MOCK] Create shipment`);
    return res.json({
      shipment_id,
      external_shipment_id: req.body?.external_shipment_id || null,
      shipment: req.body || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.SHIPMENTS}`;
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
 * GET /api/shipstation/shipments/:shipment_id/rates
 *
 * sandbox/live: calls ShipStation GET /v2/shipments/{shipment_id}/rates
 * mock: returns a few hardcoded rates (no estimated_delivery_date)
 */
router.get('/:shipment_id/rates', async (req, res, next) => {
  const { shipment_id } = req.params;
  const carrierId = typeof req.query?.carrier_id === 'string' ? req.query.carrier_id : null;

  if (config.mode === 'mock') {
    console.log(`[${new Date().toISOString()}] [MOCK] Get shipment rates for ${shipment_id}`);
    return res.json({
      shipment_id,
      rates: [
        {
          rate_id: 'se-rate-mock-101',
          rate_type: 'shipment',
          carrier_id: 'se-mock-usps',
          carrier_code: 'stamps_com',
          carrier_friendly_name: 'USPS',
          service_code: 'usps_priority_mail',
          service_type: 'USPS Priority Mail',
          shipping_amount: { currency: 'usd', amount: 8.4 },
        },
        {
          rate_id: 'se-rate-mock-102',
          rate_type: 'shipment',
          carrier_id: 'se-mock-usps',
          carrier_code: 'stamps_com',
          carrier_friendly_name: 'USPS',
          service_code: 'usps_first_class_mail',
          service_type: 'USPS First Class Mail',
          shipping_amount: { currency: 'usd', amount: 4.2 },
        },
        {
          rate_id: 'se-rate-mock-103',
          rate_type: 'shipment',
          carrier_id: 'se-mock-usps',
          carrier_code: 'stamps_com',
          carrier_friendly_name: 'USPS',
          service_code: 'usps_priority_mail_express',
          service_type: 'USPS Priority Mail Express',
          shipping_amount: { currency: 'usd', amount: 26.35 },
        },
      ],
    });
  }

  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.SHIPMENT_RATES(shipment_id)}`;
    console.log(`[${new Date().toISOString()}] [${config.mode.toUpperCase()}] GET ${url}`);

    const response = await axios.get(url, {
      headers: { 'api-key': config.apiKey },
    });

    const rates = response.data?.rates;
    if (Array.isArray(rates) && rates.length > 0) {
      return res.json(response.data);
    }

    // Fallback: calculate rates for a shipment via POST /v2/rates using carrier_ids.
    // This helps when the shipment rates endpoint returns an empty set.
    if (!carrierId) {
      return res.json(response.data);
    }

    const calcUrl = `${config.baseUrl}${SHIPSTATION_PATHS.RATES}`;
    const calcBody = {
      shipment_id,
      rate_options: {
        carrier_ids: [carrierId],
      },
    };
    console.log(
      `[${new Date().toISOString()}] [${config.mode.toUpperCase()}] POST ${calcUrl}`,
      JSON.stringify(calcBody)
    );

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

