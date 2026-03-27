import axios from 'axios';

const api = axios.create({ baseURL: '/api/shipstation' });

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.data?.error === 'rate_limited') {
      const enhanced = new Error('Rate limited by ShipStation');
      enhanced.isRateLimited = true;
      enhanced.retryAfter = err.response.data.retryAfter;
      return Promise.reject(enhanced);
    }
    return Promise.reject(err);
  }
);

export async function getCarriers() {
  const { data } = await api.get('/carriers');
  return data;
}

export async function getRates(body) {
  const { data } = await api.post('/rates', body);
  return data;
}

export async function createShipment(body) {
  const { data } = await api.post('/shipments', body);
  return data;
}

export async function getShipmentRates(shipmentId, carrierId) {
  const qs = carrierId ? `?carrier_id=${encodeURIComponent(carrierId)}` : '';
  const { data } = await api.get(`/shipments/${encodeURIComponent(shipmentId)}/rates${qs}`);
  return data;
}

/**
 * Create a label with inline shipment data in a single ShipStation call.
 * Returns label_id, shipment_id, tracking_number, label_download, shipment_cost, etc.
 */
export async function createLabel(body) {
  const { data } = await api.post('/label/create', body);
  return data;
}

export async function voidLabel(labelId) {
  const { data } = await api.put(`/label/${encodeURIComponent(labelId)}/void`);
  return data;
}

export async function trackLabel(labelId) {
  const { data } = await api.get(`/label/${encodeURIComponent(labelId)}/track`);
  return data;
}

export async function registerWebhook(body) {
  const { data } = await api.post('/webhooks/register', body);
  return data;
}

export async function getWebhookEvents() {
  const { data } = await api.get('/webhooks/events');
  return data;
}

export async function getWebhookEventsForTracking(trackingNumber, extra = {}) {
  const params = new URLSearchParams();
  if (trackingNumber) params.set('tracking_number', trackingNumber);
  if (extra?.labelId) params.set('label_id', extra.labelId);
  if (extra?.shipmentId) params.set('shipment_id', extra.shipmentId);
  if (extra?.resourceId) params.set('resource_id', extra.resourceId);

  const qs = params.toString();
  const { data } = await api.get(`/webhooks/events${qs ? `?${qs}` : ''}`);
  return data;
}

export async function clearWebhookEvents() {
  const { data } = await api.delete('/webhooks/events');
  return data;
}

export async function getHealth() {
  const { data } = await axios.get('/api/health');
  return data;
}
