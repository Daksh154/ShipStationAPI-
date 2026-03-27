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

router.get('/', async (req, res, next) => {
  try {
    const url = `${config.baseUrl}${SHIPSTATION_PATHS.CARRIERS}`;
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
