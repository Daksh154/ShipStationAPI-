// ShipStation API v2 paths
const SHIPSTATION_PATHS = {
  // ShipStation v2 does not currently include a dedicated address validation endpoint.
  // We keep this here only for reference; the address route will not call it.
  ADDRESS_VALIDATE: '/v2/addresses/validate',
  RATES_ESTIMATE: '/v2/rates/estimate',
  CARRIERS: '/v2/carriers',
  LABELS: '/v2/labels',
  LABELS_FROM_RATE: (rateId) => `/v2/labels/rates/${rateId}`,
  LABEL_VOID: (id) => `/v2/labels/${id}/void`,
  LABEL_TRACK: (id) => `/v2/labels/${id}/track`,
  WEBHOOKS: '/v2/environment/webhooks',
};

module.exports = { SHIPSTATION_PATHS };
