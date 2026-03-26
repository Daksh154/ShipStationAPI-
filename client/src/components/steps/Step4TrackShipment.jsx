import React, { useEffect, useState, useCallback } from 'react';
import { useFlow } from '../../context/FlowContext';
import { trackLabel } from '../../api/shipstation';

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

export default function Step4TrackShipment() {
  const { labelId, trackingNumber, updateChecklist, serverMode } = useFlow();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTracking = useCallback(async () => {
    if (!labelId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await trackLabel(labelId);
      setTracking(data);
      updateChecklist('trackingUpdates', 'pass');
    } catch (err) {
      if (err.isRateLimited) {
        setError(`Rate limited. Retry after ${err.retryAfter}s`);
        updateChecklist('rateLimitHandling', 'pass');
      } else {
        setError(err.response?.data?.message || err.message);
      }
      updateChecklist('trackingUpdates', 'fail');
    } finally {
      setLoading(false);
    }
  }, [labelId, updateChecklist]);

  useEffect(() => {
    if (labelId) fetchTracking();
  }, [labelId, fetchTracking]);

  const events = tracking?.events || [];
  const currentStatus = tracking?.status_code || tracking?.status || 'unknown';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Step 4 — Track Shipment</h1>
        <p className="text-gray-500 mt-1 text-sm">View tracking information for your label via ShipEngine.</p>
      </div>

      {/* Sandbox tracking note */}
      {serverMode === 'sandbox' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-1">
          <p className="font-semibold">Sandbox tracking note</p>
          <p>Tracking events require the package to be physically scanned by the carrier. In sandbox mode, the label is real and the tracking number is valid, but events will only appear once a package is actually in the mailstream. You will typically see <code className="bg-amber-100 px-1 rounded text-xs">label_created</code> status here.</p>
        </div>
      )}

      {!labelId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          No label found. Complete Step 3 to create a label first.
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
              {tracking && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  <StatusBadge status={currentStatus} />
                </div>
              )}
            </div>
            <button
              onClick={fetchTracking}
              disabled={loading || !labelId}
              className="btn-secondary"
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

          {tracking?.estimated_delivery_date && (
            <p className="text-sm text-gray-600">
              Estimated delivery: <span className="font-medium">{formatDateTime(tracking.estimated_delivery_date)}</span>
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="step-card">
          <h2 className="section-title">Tracking Timeline</h2>
          <ol className="relative border-l border-gray-200 ml-3 space-y-6">
            {events.map((event, i) => (
              <li key={i} className="ml-6">
                <span className={`absolute -left-2.5 w-5 h-5 rounded-full flex items-center justify-center ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className="w-2 h-2 bg-white rounded-full" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">
                    {event.description || event.status_description || event.event_code}
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

      {tracking && events.length === 0 && (
        <div className="step-card text-center py-8 text-gray-500 text-sm">
          No tracking events yet. The label has been created — events appear once the carrier scans the package.
        </div>
      )}
    </div>
  );
}
