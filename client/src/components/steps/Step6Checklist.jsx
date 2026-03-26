import React, { useState } from 'react';
import { useFlow } from '../../context/FlowContext';

const CHECKLIST_ITEMS = [
  { key: 'addressValid',       label: 'Address validation (valid address)' },
  { key: 'addressInvalid',     label: 'Address validation (invalid/warning address)' },
  { key: 'rateFetching',       label: 'Rate fetching (real carrier rates)' },
  { key: 'labelCreate',        label: 'Label creation (POST /v2/labels)' },
  { key: 'labelVoid',          label: 'Label void' },
  { key: 'webhookRegistration',label: 'Webhook registration (live mode only)' },
  { key: 'webhookReceipt',     label: 'Webhook event received' },
  { key: 'trackingUpdates',    label: 'Tracking query (GET /v2/labels/{id}/track)' },
  { key: 'rateLimitHandling',  label: 'Rate limit (429) handling' },
];

const ENDPOINT_SOURCES = [
  {
    endpoint: 'POST /address/validate',
    mockSource: 'Local echo',
    sandboxSource: 'Local echo',
    liveSource: 'Local echo',
    reason: 'ShipStation API v2 does not currently include a dedicated address validation endpoint. Validation can be requested during label purchase via validate_address.',
    verified: true,
  },
  {
    endpoint: 'GET /carriers',
    mockSource: 'Local 3-carrier list',
    sandboxSource: 'ShipStation sandbox API',
    liveSource: 'ShipStation live API',
    reason: 'Returns your actual carrier accounts.',
    verified: true,
  },
  {
    endpoint: 'POST /rates/estimate',
    mockSource: 'Local 3-rate list',
    sandboxSource: 'ShipStation sandbox API',
    liveSource: 'ShipStation live API',
    reason: 'Returns real rates. Sandbox rates may differ slightly from production.',
    verified: true,
  },
  {
    endpoint: 'POST /label/create',
    mockSource: 'Local mock label',
    sandboxSource: 'ShipStation sandbox API',
    liveSource: 'ShipStation live API',
    reason: 'Single-call label creation. Uses validate_address during purchase.',
    verified: true,
  },
  {
    endpoint: 'PUT /label/:id/void',
    mockSource: 'Local mock',
    sandboxSource: 'ShipStation sandbox API',
    liveSource: 'ShipStation live API',
    reason: 'Uses real label_id from label creation. Works end-to-end in sandbox.',
    verified: true,
  },
  {
    endpoint: 'GET /label/:id/track',
    mockSource: 'Local mock events',
    sandboxSource: 'ShipStation sandbox API',
    liveSource: 'ShipStation live API',
    reason: 'Returns tracking status. Sandbox shows label_created until package is physically scanned by carrier.',
    verified: true,
  },
  {
    endpoint: 'POST /webhooks/register',
    mockSource: 'Local mock webhook_id',
    sandboxSource: 'NOT supported (sandbox limitation)',
    liveSource: 'ShipStation live API',
    reason: 'Sandbox may not support webhook registration. Works in live mode.',
    verified: false,
  },
  {
    endpoint: 'POST /webhooks/receive',
    mockSource: 'Local receiver',
    sandboxSource: 'Local receiver',
    liveSource: 'Local receiver',
    reason: 'Your listener endpoint. ShipStation calls it. Always local — test with curl.',
    verified: true,
  },
];

const CURL_EXAMPLES = `# 1. Address Validation
curl -X POST http://localhost:3001/api/shipstation/address/validate \\
  -H "Content-Type: application/json" \\
  -d '[{"name":"John Doe","address_line1":"525 S Winchester Blvd","city_locality":"San Jose","state_province":"CA","postal_code":"95128","country_code":"US"}]'

# 2. Get Carriers
curl http://localhost:3001/api/shipstation/carriers

# 3. Get Rates
curl -X POST http://localhost:3001/api/shipstation/rates \\
  -H "Content-Type: application/json" \\
  -d '{"carrier_ids":["YOUR_CARRIER_ID"],"from_postal_code":"78756","to_postal_code":"95128","from_country_code":"US","to_country_code":"US","weight":{"value":20,"unit":"ounce"},"dimensions":{"length":12,"width":8,"height":4,"unit":"inch"}}'

# 4. Create Label (single call — shipment + label)
curl -X POST http://localhost:3001/api/shipstation/label/create \\
  -H "Content-Type: application/json" \\
  -d '{"carrier_id":"YOUR_CARRIER_ID","service_code":"usps_priority_mail","ship_from":{"name":"My Store","phone":"+1 512-555-1234","address_line1":"4009 Marathon Blvd","city_locality":"Austin","state_province":"TX","postal_code":"78756","country_code":"US","address_residential_indicator":"no"},"ship_to":{"name":"Jane Doe","phone":"+1 444-444-4444","address_line1":"525 S Winchester Blvd","city_locality":"San Jose","state_province":"CA","postal_code":"95128","country_code":"US","address_residential_indicator":"yes"},"packages":[{"weight":{"value":20,"unit":"ounce"},"dimensions":{"length":12,"width":8,"height":4,"unit":"inch"}}]}'

# 5. Track Label
curl http://localhost:3001/api/shipstation/label/YOUR_LABEL_ID/track

# 6. Void Label
curl -X PUT http://localhost:3001/api/shipstation/label/YOUR_LABEL_ID/void

# 7. Simulate Incoming Webhook
curl -X POST http://localhost:3001/api/shipstation/webhooks/receive \\
  -H "Content-Type: application/json" \\
  -H "x-shipstation-timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \\
  -d '{"event":"fulfillment_shipped_v2","resource_id":"se-123","tracking_number":"9400111899"}'`;

function StatusIcon({ status }) {
  if (status === 'pass') return <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-white text-xs">✓</span>;
  if (status === 'fail') return <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white text-xs">✗</span>;
  return <span className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-300 text-gray-300 text-xs">○</span>;
}

export default function Step6Checklist() {
  const { checklistStatus, updateChecklist } = useFlow();
  const [showGuide, setShowGuide] = useState(false);

  const passed = CHECKLIST_ITEMS.filter((item) => checklistStatus[item.key] === 'pass').length;
  const total = CHECKLIST_ITEMS.length;
  const allPassed = passed === total;

  function toggleItem(key) {
    const current = checklistStatus[key];
    updateChecklist(key, current === 'pass' ? 'pending' : current === 'pending' ? 'fail' : 'pending');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Step 6 — Test Checklist</h1>
        <p className="text-gray-500 mt-1 text-sm">End-to-end verification checklist for ShipStation integration.</p>
      </div>

      {/* Progress Banner */}
      <div className={`p-5 rounded-xl border ${allPassed ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-3">
          <p className={`font-semibold ${allPassed ? 'text-green-900' : 'text-gray-900'}`}>
            {allPassed ? `All ${passed}/${total} checks passed — Ready to go live!` : `${passed}/${total} checks passed`}
          </p>
          <span className="text-sm text-gray-500">{Math.round((passed / total) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${allPassed ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${(passed / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="step-card space-y-2">
        <h2 className="section-title">Checks</h2>
        <p className="text-xs text-gray-400 -mt-2 mb-3">Items auto-update as you complete steps. Click to manually toggle.</p>
        {CHECKLIST_ITEMS.map((item) => {
          const status = checklistStatus[item.key];
          return (
            <button
              key={item.key}
              onClick={() => toggleItem(item.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                status === 'pass' ? 'bg-green-50 border-green-200' :
                status === 'fail' ? 'bg-red-50 border-red-200' :
                'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <StatusIcon status={status} />
              <span className={`text-sm flex-1 ${status === 'pass' ? 'text-green-800' : status === 'fail' ? 'text-red-800' : 'text-gray-700'}`}>
                {item.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                status === 'pass' ? 'bg-green-100 text-green-700' :
                status === 'fail' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {status}
              </span>
            </button>
          );
        })}
      </div>

      {/* Endpoint Source Table */}
      <div className="step-card space-y-3">
        <div>
          <h2 className="section-title">Endpoint Source Map</h2>
          <p className="text-xs text-gray-400 -mt-1">Exactly where each response comes from in each mode.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Endpoint</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">mock</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">sandbox</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">live</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINT_SOURCES.map((row) => (
                <tr key={row.endpoint} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-mono font-medium text-gray-800 whitespace-nowrap">{row.endpoint}</td>
                  <td className="border border-gray-200 px-3 py-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Local
                    </span>
                  </td>
                  <td className="border border-gray-200 px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.sandboxSource.includes('NOT') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {row.sandboxSource.includes('NOT') ? 'Not supported' : 'ShipStation sandbox'}
                    </span>
                  </td>
                  <td className="border border-gray-200 px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.liveSource.includes('Local') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {row.liveSource.includes('Local') ? 'Local receiver' : 'ShipStation live'}
                    </span>
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-500 max-w-xs">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 space-y-1">
          <p className="font-semibold">Production confidence with sandbox:</p>
          <ul className="list-disc list-inside space-y-0.5 text-green-700">
            <li>All critical endpoints (rates, label, void, track) hit the real ShipStation API code paths in sandbox.</li>
            <li>Sandbox uses carrier dev environments — same validation, same response shapes as production.</li>
            <li>Going live = swap <code className="bg-green-100 px-1 rounded">TEST_</code> key for production key. No URL changes, no code changes.</li>
            <li>Webhooks only: requires <code className="bg-green-100 px-1 rounded">MODE=live</code> to test registration. Receiver always works.</li>
          </ul>
        </div>
      </div>

      {/* Testing Guide */}
      <div className="step-card">
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="section-title mb-0">How to Test</h2>
          <span className="text-gray-400 text-lg">{showGuide ? '▲' : '▼'}</span>
        </button>

        {showGuide && (
          <div className="mt-4 space-y-6 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Mode Configuration (server/.env)</h3>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`# Sandbox — ShipStation API v2, test key
SHIPSTATION_API_KEY=your_test_key_here
MODE=sandbox

# Live — production, real labels, real money
SHIPSTATION_API_KEY=your_production_key_here
MODE=live

# Offline demo only
MODE=mock`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Webhooks in Live Mode — Use ngrok</h3>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`# Install ngrok: https://ngrok.com
brew install ngrok

# Expose your local server
ngrok http 3001

# Use the forwarding URL as your webhook URL:
# https://abc123.ngrok.io/api/shipstation/webhooks/receive`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Sample curl Commands</h3>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {CURL_EXAMPLES}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
