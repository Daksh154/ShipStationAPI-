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
 * POST /api/shipstation/label/create
 *
 * Creates a label with inline shipment data in a SINGLE API call.
 * ShipEngine POST /v1/labels — response includes both shipment_id AND label_id,
 * plus tracking_number and label_download URLs.
 *
 * sandbox/live: calls real ShipEngine API — returns a real PDF-downloadable label
 * mock: returns local mock data
 *
 * Expected body:
 *   carrier_id, service_code, ship_from (address obj), ship_to (address obj),
 *   packages ([{ weight, dimensions }]), label_format, label_layout
 */
router.post('/create', async (req, res, next) => {
  const { carrier_id, service_code, ship_from, ship_to, packages, label_format, label_layout } = req.body;

  if (config.mode === 'mock') {
    const mockLabelId = `se-mock-label-${Date.now()}`;
    console.log(`[${new Date().toISOString()}] [MOCK] Create label`);
    return res.json({
      label_id: mockLabelId,
      status: 'completed',
      shipment_id: `se-mock-ship-${Date.now()}`,
      tracking_number: '9400111899223456789012',
      carrier_id: carrier_id || 'se-mock-usps',
      service_code: service_code || 'usps_priority_mail',
      ship_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      shipment_cost: { currency: 'usd', amount: 8.40 },
      label_format: label_format || 'pdf',
      label_layout: label_layout || '4x6',
      trackable: true,
      voided: false,
      voided_at: null,
      label_download: {
        href: 'https://api.shipengine.com/v1/downloads/sample-label.pdf',
        pdf: 'https://api.shipengine.com/v1/downloads/sample-label.pdf',
        png: 'https://api.shipengine.com/v1/downloads/sample-label.png',
        zpl: 'https://api.shipengine.com/v1/downloads/sample-label.zpl',
      },
    });
  }

  try {
    const url = `${config.baseUrl}${SHIPENGINE_PATHS.LABELS}`;

    const payload = {
      shipment: {
        carrier_id,
        service_code,
        ship_from,
        ship_to,
        packages,
      },
      label_format: label_format || 'pdf',
      label_layout: label_layout || '4x6',
    };

    console.log(`[${new Date().toISOString()}] [${config.mode.toUpperCase()}] POST ${url}`, JSON.stringify(payload));

    const response = await axios.post(url, payload, {
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
 * PUT /api/shipstation/label/:label_id/void
 *
 * sandbox/live: calls ShipEngine PUT /v1/labels/{id}/void
 *   label_id is a real se-XXXXXXX from label creation — this works end-to-end
 * mock: returns local mock
 */
router.put('/:label_id/void', async (req, res, next) => {
  const { label_id } = req.params;

  if (config.mode === 'mock') {
    console.log(`[${new Date().toISOString()}] [MOCK] Void label ${label_id}`);
    return res.json({ approved: true, message: 'Request for refund submitted' });
  }

  try {
    const url = `${config.baseUrl}${SHIPENGINE_PATHS.LABEL_VOID(label_id)}`;
    console.log(`[${new Date().toISOString()}] [${config.mode.toUpperCase()}] PUT ${url}`);

    const response = await axios.put(url, {}, {
      headers: { 'API-Key': config.apiKey },
    });

    res.json(response.data);
  } catch (err) {
    if (handle429(err, res)) return;
    next({ message: err.message, details: err.response?.data });
  }
});

/**
 * GET /api/shipstation/label/:label_id/track
 *
 * sandbox/live: calls ShipEngine GET /v1/labels/{id}/track
 *   Note: tracking events require the package to be in the carrier mailstream.
 *   Sandbox labels may show "label_created" status until scanned by carrier.
 * mock: returns local mock with simulated events
 */
router.get('/:label_id/track', async (req, res, next) => {
  const { label_id } = req.params;

  if (config.mode === 'mock') {
    const now = new Date();
    console.log(`[${new Date().toISOString()}] [MOCK] Track label ${label_id}`);
    return res.json({
      tracking_number: '9400111899223456789012',
      status_code: 'in_transit',
      status_description: 'In Transit',
      estimated_delivery_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      events: [
        {
          occurred_at: new Date(now - 2 * 3600000).toISOString(),
          description: 'Package in transit',
          status_code: 'in_transit',
          city_locality: 'Louisville', state_province: 'KY', country_code: 'US',
        },
        {
          occurred_at: new Date(now - 8 * 3600000).toISOString(),
          description: 'Departed facility',
          status_code: 'in_transit',
          city_locality: 'Cupertino', state_province: 'CA', country_code: 'US',
        },
        {
          occurred_at: new Date(now - 10 * 3600000).toISOString(),
          description: 'Shipping label created',
          status_code: 'accepted',
          city_locality: 'Cupertino', state_province: 'CA', country_code: 'US',
        },
      ],
    });
  }

  try {
    const url = `${config.baseUrl}${SHIPENGINE_PATHS.LABEL_TRACK(label_id)}`;
    console.log(`[${new Date().toISOString()}] [${config.mode.toUpperCase()}] GET ${url}`);

    const response = await axios.get(url, {
      headers: { 'API-Key': config.apiKey },
    });

    res.json(response.data);
  } catch (err) {
    if (handle429(err, res)) return;
    next({ message: err.message, details: err.response?.data });
  }
});

module.exports = router;
