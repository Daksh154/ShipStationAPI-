require('dotenv').config();

// Supported modes:
//   mock    — local responses only, no network calls
//   sandbox — api.shipengine.com/v1 with TEST_ key
//   live    — api.shipengine.com/v1 with production key
const mode = process.env.MODE || 'mock';

const SHIPENGINE_BASE = 'https://api.shipengine.com/v1';

const config = {
  apiKey: process.env.SHIPENGINE_API_KEY || '',
  mode,
  port: parseInt(process.env.PORT || '3001', 10),
  // Both sandbox and live point to the same ShipEngine URL — the key determines the environment
  baseUrl: mode === 'mock' ? null : SHIPENGINE_BASE,
};

module.exports = config;
