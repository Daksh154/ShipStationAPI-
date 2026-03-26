import React, { useState, useEffect, useRef } from 'react';
import { registerWebhook, getWebhookEvents, clearWebhookEvents } from '../../api/shipstation';
import { useFlow } from '../../context/FlowContext';

const WEBHOOK_EVENTS = [
  { value: 'fulfillment_shipped_v2', label: 'Fulfillment Shipped' },
  { value: 'fulfillment_rejected_v2', label: 'Fulfillment Rejected' },
  { value: 'track_event_v2', label: 'Tracking Event (v2)' },
  { value: 'sales_orders_imported', label: 'Sales Orders Imported' },
];

export default function Step5Webhooks() {
  const { updateChecklist, serverMode } = useFlow();

  const [regForm, setRegForm] = useState({
    name: 'My Demo Webhook',
    event: 'fulfillment_shipped_v2',
    url: 'https://your-ngrok-url.ngrok.io/api/shipstation/webhooks/receive',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [webhookId, setWebhookId] = useState(null);
  const [regError, setRegError] = useState(null);

  const [events, setEvents] = useState([]);
  const pollRef = useRef(null);

  function handleRegChange(e) {
    setRegForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    try {
      const data = await registerWebhook({
        name: regForm.name,
        event: regForm.event,
        url: regForm.url,
      });
      setWebhookId(data.webhook_id || data.id || JSON.stringify(data));
      updateChecklist('webhookRegistration', 'pass');
    } catch (err) {
      const errData = err.response?.data;
      setRegError(errData?.errors?.[0]?.message || errData?.message || err.message);
      updateChecklist('webhookRegistration', 'fail');
    } finally {
      setRegLoading(false);
    }
  }

  async function fetchEvents() {
    try {
      const data = await getWebhookEvents();
      setEvents(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        updateChecklist('webhookReceipt', 'pass');
      }
    } catch {
      // silently fail polling
    }
  }

  useEffect(() => {
    fetchEvents();
    pollRef.current = setInterval(fetchEvents, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function handleClear() {
    try {
      await clearWebhookEvents();
      setEvents([]);
    } catch {
      setEvents([]);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Step 4 — Webhooks</h1>
        <p className="text-gray-500 mt-1 text-sm">Register webhooks and monitor incoming events.</p>
      </div>

      {serverMode === 'sandbox' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-1">
          <p className="font-semibold">Sandbox note</p>
          <p>
            Webhook registration is attempted in sandbox, but ShipStation may reject it or may not deliver events depending on current sandbox support.
            If registration fails, the error shown below is the exact ShipStation response.
          </p>
        </div>
      )}

      {/* Register Section */}
      <div className="step-card space-y-4">
        <h2 className="section-title">Register Webhook</h2>

        {webhookId ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <p className="text-green-800 font-medium text-sm">Webhook Registered</p>
            <div className="bg-white rounded border border-green-200 p-3 font-mono text-sm text-gray-700 break-all">
              {webhookId}
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label-text">Webhook Name</label>
              <input className="input-field" name="name" value={regForm.name} onChange={handleRegChange} required />
            </div>
            <div>
              <label className="label-text">Event Type</label>
              <select className="input-field" name="event" value={regForm.event} onChange={handleRegChange}>
                {WEBHOOK_EVENTS.map((ev) => (
                  <option key={ev.value} value={ev.value}>{ev.label} ({ev.value})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Webhook URL</label>
              <input className="input-field" name="url" value={regForm.url} onChange={handleRegChange} placeholder="https://..." required />
              <p className="text-xs text-gray-400 mt-1">Use ngrok to expose your local server (see Step 6 checklist for instructions)</p>
            </div>

            {regError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {regError}
              </div>
            )}

            <button type="submit" disabled={regLoading} className="btn-primary">
              {regLoading ? 'Registering...' : 'Register Webhook'}
            </button>
          </form>
        )}
      </div>

      {/* Manual test */}
      <div className="step-card space-y-3">
        <h2 className="section-title">Test the Receiver (All Modes)</h2>
        <p className="text-sm text-gray-600">Send a test event to your local webhook receiver with curl:</p>
        <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`curl -X POST http://localhost:3001/api/shipstation/webhooks/receive \\
  -H "Content-Type: application/json" \\
  -H "x-shipstation-timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \\
  -d '{"event":"fulfillment_shipped_v2","resource_id":"se-123","tracking_number":"9400111899"}'`}
        </pre>
      </div>

      {/* Events Section */}
      <div className="step-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title mb-0">Received Events</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live (polling every 5s)
            </span>
            {events.length > 0 && (
              <button onClick={handleClear} className="btn-secondary text-xs py-1">Clear</button>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm">No webhook events received yet.</p>
            <p className="text-xs mt-1">Use the curl command above to send a test event.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.map((ev, i) => (
              <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{ev.eventType || 'unknown'}</span>
                  <span className="text-gray-400">{new Date(ev.receivedAt).toLocaleTimeString()}</span>
                </div>
                <pre className="text-gray-600 overflow-x-auto whitespace-pre-wrap break-all text-xs font-mono bg-white rounded border border-gray-200 p-2">
                  {JSON.stringify(ev.payload, null, 2).slice(0, 300)}
                  {JSON.stringify(ev.payload).length > 300 ? '\n...' : ''}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
