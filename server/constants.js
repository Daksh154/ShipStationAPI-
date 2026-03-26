// ShipEngine API v1 paths
const SHIPENGINE_PATHS = {
  ADDRESS_VALIDATE: '/addresses/validate',
  RATES_ESTIMATE:   '/rates/estimate',
  CARRIERS:         '/carriers',
  LABELS:           '/labels',
  LABEL_VOID:       (id) => `/labels/${id}/void`,
  LABEL_TRACK:      (id) => `/labels/${id}/track`,
  WEBHOOKS:         '/environment/webhooks',
};

module.exports = { SHIPENGINE_PATHS };
