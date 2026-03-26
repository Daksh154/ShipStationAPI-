import React, { useEffect, useState, useCallback } from 'react';
import { useFlow } from '../../context/FlowContext';
import { getWebhookEventsForTracking } from '../../api/shipstation';

const STATUS_CONFIG = {
  delivered:        { label: 'Delivered',          color: 'bg-green-100 text-green-800' },
  in_transit:       { label: 'In Transit',          color: 'bg-blue-100 text-blue-800' },
  exception:        { label: 'Exception',           color: 'bg-red-100 text-red-800' },
  out_for_delivery: { label: 'Out for Delivery',    color: 'bg-purple-100 text-purple-800' },
  accepted:         { label: 'Accepted',            color: 'bg-yellow-100 text-yellow-800' },
  label_created:    { label: 'Label Created',       color: 'bg-gray-100 text-gray-800' },
  ny:               { label: 'Not Yet In System',   color: 'bg-gray-100 text-gray-600' },
  it:               { label: 'In Transit',          color: 'bg-blue-100 text-blue-800' },
  de:               { label: 'Delivered',           color: 'bg-green-100 text-green-800' },
  ex:               { label: 'Exception',           color: 'bg-red-100 text-red-800' },
  at:               { label: 'At Destination',      color: 'bg-purple-100 text-purple-800' },
  unknown:          { label: 'Unknown',             color: 'bg-gray-100 text-gray-800' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.unknown;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function pickFirstString(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

function asIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function extractTrackEvent(webhookEvent) {
  const payload = webhookEvent?.payload || {};
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

  const occurredAt =
    pickFirstString(
      data?.occurred_at,
      data?.carrier_occurred_at,
      data?.event_time,
      data?.event_timestamp,
      payload?.occurred_at,
      payload?.carrier_occurred_at
    ) || webhookEvent?.receivedAt;

  const status =
    pickFirstString(
      data?.status_code,
      data?.status,
      data?.tracking_status,
      payload?.status_code,
      payload?.status
    ) || 'unknown';

  const description =
    pickFirstString(
      data?.description,
      data?.status_description,
      data?.message,
      data?.event_code,
      payload?.description,
      payload?.status_description
    ) || webhookEvent?.eventType || 'Tracking update';

  const city = pickFirstString(data?.city_locality, data?.city, payload?.city_locality, payload?.city);
  const state = pickFirstString(data?.state_province, data?.state, payload?.state_province, payload?.state);
  const postal = pickFirstString(data?.postal_code, data?.postal, payload?.postal_code, payload?.postal);

  return {
    occurred_at: asIso(occurredAt) || occurredAt,
    status_code: status,
    description,
    city_locality: city,
    state_province: state,
    postal_code: postal,
    raw: webhookEvent,
  };
}

export default function Step4TrackShipment() {
  const { labelId, trackingNumber, updateChecklist, serverMode } = useFlow();
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTracking = useCallback(async () => {
    if (!trackingNumber) return;
    setLoading(true);
    setError(null);
    try {
      // Track Events v2 webhooks are most reliably correlated by tracking_number.
      // Not all webhook payloads include label_id, so we avoid filtering by it here.
      const data = await getWebhookEventsForTracking(trackingNumber);
      const events = Array.isArray(data) ? data : [];
      setWebhookEvents(events);
      if (events.length > 0) updateChecklist('trackingUpdates', 'pass');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [trackingNumber, labelId, updateChecklist]);

  useEffect(() => {
    if (!trackingNumber) return;
    // load any already-received events once (no polling)
    fetchTracking();
  }, [trackingNumber, fetchTracking]);

  useEffect(() => {
    if (!trackingNumber) return;
    setError(null);

    const params = new URLSearchParams();
    params.set('tracking_number', trackingNumber);

    const es = new EventSource(`/api/shipstation/webhooks/stream?${params.toString()}`);

    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data);
        setWebhookEvents((prev) => {
          const next = [ev, ...prev];
          return next.slice(0, 20);
        });
        updateChecklist('trackingUpdates', 'pass');
      } catch {
        // ignore malformed event
      }
    };

    es.onerror = () => {
      // Keep existing events; show a lightweight hint.
      // (EventSource will retry automatically.)
      setError((prev) => prev || 'Live webhook stream disconnected. Waiting to reconnect…');
    };

    return () => es.close();
  }, [trackingNumber, updateChecklist]);

  const timeline = webhookEvents
    .filter((ev) => (ev?.eventType || '').toLowerCase().includes('track'))
    .map(extractTrackEvent);
  const currentStatus = timeline?.[0]?.status_code || 'unknown';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Step 3 — Track Shipment</h1>
        <p className="text-gray-500 mt-1 text-sm">View tracking updates from ShipStation Track Events v2 webhooks.</p>
      </div>

      {serverMode === 'sandbox' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-1">
          <p className="font-semibold">Sandbox tracking note</p>
          <p>Webhook delivery and carrier scans can be limited in sandbox. If you don’t see events, try sending a simulated payload to the receiver in Step 4 Webhooks.</p>
        </div>
      )}

      {!trackingNumber && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          No tracking number found. Complete Step 2 to create a label first.
        </div>
      )}

      {(labelId || trackingNumber) && (
        <div className="step-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              {trackingNumber && (
                <p className="text-sm">
                  <span className="text-gray-500">Tracking: </span>
                  <span className="font-mono font-medium text-gray-900">{trackingNumber}</span>
                </p>
              )}
              {labelId && (
                <p className="text-sm mt-1">
                  <span className="text-gray-500">Label ID: </span>
                  <span className="font-mono text-gray-700 text-xs">{labelId}</span>
                </p>
              )}
              {timeline.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  <StatusBadge status={currentStatus} />
                </div>
              )}
            </div>
            <button
              onClick={fetchTracking}
              disabled={loading || !trackingNumber}
              className="btn-secondary"
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {timeline.length > 0 && (
        <div className="step-card">
          <h2 className="section-title">Tracking Timeline</h2>
          <ol className="relative border-l border-gray-200 ml-3 space-y-6">
            {timeline.map((event, i) => (
              <li key={i} className="ml-6">
                <span className={`absolute -left-2.5 w-5 h-5 rounded-full flex items-center justify-center ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className="w-2 h-2 bg-white rounded-full" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">
                    {event.description}
                  </p>
                  {(event.city_locality || event.state_province) && (
                    <p className="text-xs text-gray-500">
                      {[event.city_locality, event.state_province, event.postal_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {formatDateTime(event.occurred_at || event.carrier_occurred_at)}
                  </p>
                  {event.status_code && <StatusBadge status={event.status_code} />}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {trackingNumber && timeline.length === 0 && !loading && !error && (
        <div className="step-card text-center py-8 text-gray-500 text-sm">
          No tracking webhook events yet. Register a <code className="bg-gray-100 px-1 rounded text-xs">track_event_v2</code> webhook in Step 4 and wait for delivery, or send a simulated event to the receiver to test end-to-end.
        </div>
      )}
    </div>
  );
}
