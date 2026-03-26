require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config');

const addressRoutes  = require('./routes/address');
const carriersRoutes = require('./routes/carriers');
const ratesRoutes    = require('./routes/rates');
const labelRoutes    = require('./routes/label');
const webhookRoutes  = require('./routes/webhooks');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/shipstation/address',  addressRoutes);
app.use('/api/shipstation/carriers', carriersRoutes);
app.use('/api/shipstation/rates',    ratesRoutes);
app.use('/api/shipstation/label',    labelRoutes);
app.use('/api/shipstation/webhooks', webhookRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: config.mode,
    baseUrl: config.baseUrl || 'local-mock',
    apiKeySet: !!config.apiKey,
  });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${config.port} in ${config.mode.toUpperCase()} mode`);
  if (config.baseUrl) {
    console.log(`[${new Date().toISOString()}] ShipStation base URL: ${config.baseUrl}`);
  } else {
    console.log(`[${new Date().toISOString()}] Running in local mock mode — no network calls`);
  }
});
