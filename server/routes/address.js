const express = require('express');
const config = require('../config');

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
 * ShipStation API v2 does NOT currently provide a dedicated address validation endpoint.
 * This route remains for the demo flow, but always returns a local "verified" response.
 * Real validation can be performed during label purchase by using `validate_address`
 * on `POST /v2/labels`.
 *
 * Response shape matches the existing demo expectation:
 *   [{ status: 'verified'|'warning'|'error', matched_address: {...}, messages: [...] }]
 */
router.post('/validate', async (req, res, next) => {
  try {
    const input = Array.isArray(req.body) ? req.body[0] : req.body;
    console.log(`[${new Date().toISOString()}] [${config.mode.toUpperCase()}] Address validate (local):`, JSON.stringify(input));
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
  } catch (err) {
    if (handle429(err, res)) return;
    next({ message: err.message, details: err.response?.data });
  }
});

module.exports = router;
