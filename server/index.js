require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config');

const carriersRoutes = require('./routes/carriers');
const ratesRoutes    = require('./routes/rates');
const shipmentsRoutes = require('./routes/shipments');
const labelRoutes    = require('./routes/label');
const webhookRoutes  = require('./routes/webhooks');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/shipstation/carriers', carriersRoutes);
app.use('/api/shipstation/rates',    ratesRoutes);
app.use('/api/shipstation/shipments', shipmentsRoutes);
app.use('/api/shipstation/label',    labelRoutes);
app.use('/api/shipstation/webhooks', webhookRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    baseUrl: config.baseUrl,
    apiKeySet: !!config.apiKey,
  });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${config.port}`);
  console.log(`[${new Date().toISOString()}] ShipStation base URL: ${config.baseUrl}`);
});
