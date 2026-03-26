require('dotenv').config();

// Supported modes:
//   mock    — local responses only, no network calls
//   sandbox — api.shipstation.com/v2 with test key
//   live    — api.shipstation.com/v2 with production key
const mode = process.env.MODE || 'mock';

const SHIPSTATION_BASE = 'https://api.shipstation.com';

const config = {
  apiKey: process.env.SHIPSTATION_API_KEY || '',
  mode,
  port: parseInt(process.env.PORT || '3001', 10),
  // Both sandbox and live point to the same ShipStation URL — the key determines the environment
  baseUrl: mode === 'mock' ? null : SHIPSTATION_BASE,
};

module.exports = config;
