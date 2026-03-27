// ShipStation API v2 paths
const SHIPSTATION_PATHS = {
  RATES: '/v2/rates',
  RATES_ESTIMATE: '/v2/rates/estimate',
  SHIPMENTS: '/v2/shipments',
  SHIPMENT_RATES: (shipmentId) => `/v2/shipments/${shipmentId}/rates`,
  CARRIERS: '/v2/carriers',
  LABELS: '/v2/labels',
  LABELS_FROM_RATE: (rateId) => `/v2/labels/rates/${rateId}`,
  LABEL_VOID: (id) => `/v2/labels/${id}/void`,
  LABEL_TRACK: (id) => `/v2/labels/${id}/track`,
  WEBHOOKS: '/v2/environment/webhooks',
};

module.exports = { SHIPSTATION_PATHS };
