require('dotenv').config();

const config = {
  apiKey: process.env.SHIPSTATION_API_KEY || '',
  port: parseInt(process.env.PORT || '3001', 10),
  baseUrl: 'https://api.shipstation.com',
};

module.exports = config;
