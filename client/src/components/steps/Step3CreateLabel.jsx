import React, { useState } from 'react';
import { useFlow } from '../../context/FlowContext';
import { createLabel, voidLabel } from '../../api/shipstation';

export default function Step3CreateLabel() {
  const {
    selectedRate,
    shipmentId,
    validatedAddress,
    setLabelId,
    setTrackingNumber,
    labelVoided,
    setLabelVoided,
    goToStep,
    updateChecklist,
  } = useFlow();

  const [shipFrom, setShipFrom] = useState({
    name: 'My Store',
    company_name: 'My Store Inc.',
    phone: '+1 512-555-1234',
    address_line1: '4009 Marathon Blvd',
    city_locality: 'Austin',
    state_province: 'TX',
    postal_code: '78756',
    country_code: 'US',
    address_residential_indicator: 'no',
  });

  const [shipToPhone, setShipToPhone] = useState('+1 202-555-1234');
  const [weight, setWeight] = useState({ value: 20, unit: 'ounce' });
  const [dimensions, setDimensions] = useState({ length: 12, width: 8, height: 4, unit: 'inch' });
  const [labelFormat, setLabelFormat] = useState('pdf');
  const [labelLayout, setLabelLayout] = useState('4x6');

  const [loading, setLoading] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function handleShipFromChange(e) {
    setShipFrom((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const shipTo = validatedAddress
      ? {
          name: validatedAddress.name || 'Recipient',
          phone: shipToPhone,
          address_line1: validatedAddress.address_line1,
          city_locality: validatedAddress.city_locality,
          state_province: validatedAddress.state_province,
          postal_code: validatedAddress.postal_code,
          country_code: validatedAddress.country_code || 'US',
          address_residential_indicator: 'yes',
        }
      : {
          name: 'Jane Doe',
          phone: shipToPhone,
          address_line1: '525 S Winchester Blvd',
          city_locality: 'San Jose',
          state_province: 'CA',
          postal_code: '95128',
          country_code: 'US',
          address_residential_indicator: 'yes',
        };

    const body = {
      test_label: true,
      shipment_id: shipmentId || null,
      rate_id: selectedRate?.rate_id || null,
      selected_rate_amount: typeof selectedRate?.rate === 'number' ? selectedRate.rate : null,
      carrier_id: selectedRate?.carrier_id || '',
      service_code: selectedRate?.service_code || 'usps_priority_mail',
      ship_from: shipFrom,
      ship_to: shipTo,
      packages: [{ weight, dimensions }],
      label_format: labelFormat,
      label_layout: labelLayout,
    };

    try {
      const data = await createLabel(body);
      const rawLabelId = typeof data?.label_id === 'string' ? data.label_id : null;
      setResult({ ...data, label_id: rawLabelId });
      setLabelId(rawLabelId);
      setTrackingNumber(data.tracking_number);
      updateChecklist('labelCreate', 'pass');
    } catch (err) {
      if (err.isRateLimited) {
        setError(`Rate limited. Retry after ${err.retryAfter}s`);
        updateChecklist('rateLimitHandling', 'pass');
      } else {
        const details = err.response?.data?.errors?.[0]?.message
          || err.response?.data?.message
          || err.message;
        setError(details);
      }
      updateChecklist('labelCreate', 'fail');
    } finally {
      setLoading(false);
    }
  }

  async function handleVoid() {
    if (!result?.label_id) return;
    setVoidLoading(true);
    try {
      await voidLabel(result.label_id);
      setLabelVoided(true);
      updateChecklist('labelVoid', 'pass');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      updateChecklist('labelVoid', 'fail');
    } finally {
      setVoidLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Step 3 — Create Label</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Creates a shipment + purchases a label in a single ShipStation API call (<code className="text-xs bg-gray-100 px-1 rounded">POST /v2/labels</code>).
        </p>
      </div>

      {selectedRate && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800">Selected Rate</p>
          <p className="text-sm text-blue-700 mt-0.5">
            {selectedRate.carrier_friendly_name} — {selectedRate.service_type || selectedRate.service_code}
            {typeof selectedRate.rate === 'number' ? ` · $${selectedRate.rate.toFixed(2)}` : ''}
          </p>
          <p className="text-xs text-blue-500 mt-0.5 font-mono">{selectedRate.carrier_id}</p>
        </div>
      )}

      {!selectedRate && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          No rate selected. Go back to Step 2 to select a rate.
        </div>
      )}

      {!result && (
        <form onSubmit={handleSubmit} className="step-card space-y-5">
          {/* Ship From */}
          <div>
            <h2 className="section-title">Ship From</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label-text">Name / Company</label>
                <input className="input-field" name="name" value={shipFrom.name} onChange={handleShipFromChange} required />
              </div>
              <div className="col-span-2">
                <label className="label-text">Address</label>
                <input className="input-field" name="address_line1" value={shipFrom.address_line1} onChange={handleShipFromChange} required />
              </div>
              <div>
                <label className="label-text">City</label>
                <input className="input-field" name="city_locality" value={shipFrom.city_locality} onChange={handleShipFromChange} required />
              </div>
              <div>
                <label className="label-text">State</label>
                <input className="input-field" name="state_province" value={shipFrom.state_province} onChange={handleShipFromChange} required />
              </div>
              <div>
                <label className="label-text">Postal Code</label>
                <input className="input-field" name="postal_code" value={shipFrom.postal_code} onChange={handleShipFromChange} required />
              </div>
              <div>
                <label className="label-text">Phone</label>
                <input className="input-field" name="phone" value={shipFrom.phone} onChange={handleShipFromChange} required />
              </div>
            </div>
          </div>

          {/* Ship To */}
          <div>
            <h2 className="section-title">Ship To (from Step 1)</h2>
            {validatedAddress ? (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 space-y-1">
                <p className="font-medium">{validatedAddress.name || 'Recipient'}</p>
                <p>{validatedAddress.address_line1}</p>
                <p>{validatedAddress.city_locality}, {validatedAddress.state_province} {validatedAddress.postal_code}</p>
                <p>{validatedAddress.country_code}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Complete Step 1 to auto-fill address. A sample San Jose address will be used.</p>
            )}
            <div className="mt-3">
              <label className="label-text">Recipient Phone <span className="text-red-500">*</span></label>
              <input
                className="input-field"
                value={shipToPhone}
                onChange={(e) => setShipToPhone(e.target.value)}
                placeholder="+1 555-555-5555"
                required
              />
            </div>
          </div>

          {/* Package */}
          <div>
            <h2 className="section-title">Package</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Weight</label>
                <div className="flex gap-2">
                  <input
                    className="input-field"
                    type="number"
                    value={weight.value}
                    onChange={(e) => setWeight((prev) => ({ ...prev, value: parseFloat(e.target.value) || 1 }))}
                    min="0.1"
                    step="0.1"
                  />
                  <select
                    className="input-field w-28"
                    value={weight.unit}
                    onChange={(e) => setWeight((prev) => ({ ...prev, unit: e.target.value }))}
                  >
                    <option value="ounce">oz</option>
                    <option value="pound">lbs</option>
                    <option value="gram">g</option>
                    <option value="kilogram">kg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-text">L × W × H (inch)</label>
                <div className="flex gap-2">
                  <input className="input-field" type="number" placeholder="L" value={dimensions.length} onChange={(e) => setDimensions((p) => ({ ...p, length: parseFloat(e.target.value) || 1 }))} min="1" />
                  <input className="input-field" type="number" placeholder="W" value={dimensions.width} onChange={(e) => setDimensions((p) => ({ ...p, width: parseFloat(e.target.value) || 1 }))} min="1" />
                  <input className="input-field" type="number" placeholder="H" value={dimensions.height} onChange={(e) => setDimensions((p) => ({ ...p, height: parseFloat(e.target.value) || 1 }))} min="1" />
                </div>
              </div>
            </div>
          </div>

          {/* Label Options */}
          <div>
            <h2 className="section-title">Label Options</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Format</label>
                <select className="input-field" value={labelFormat} onChange={(e) => setLabelFormat(e.target.value)}>
                  <option value="pdf">PDF</option>
                  <option value="zpl">ZPL</option>
                  <option value="png">PNG</option>
                </select>
              </div>
              <div>
                <label className="label-text">Layout</label>
                <select className="input-field" value={labelLayout} onChange={(e) => setLabelLayout(e.target.value)}>
                  <option value="4x6">4×6</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading || !selectedRate} className="btn-primary w-full justify-center">
            {loading ? 'Creating Label...' : 'Create Label (POST /v2/labels)'}
          </button>
        </form>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="step-card space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xl ${labelVoided ? 'text-red-500' : 'text-green-600'}`}>
              {labelVoided ? '✗' : '✓'}
            </span>
            <h2 className={`font-semibold ${labelVoided ? 'text-red-900 line-through' : 'text-green-900'}`}>
              Label {labelVoided ? 'Voided' : 'Created'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500 font-medium">Label ID</span>
              <span className="font-mono text-gray-900 break-all text-right ml-4">{result.label_id}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500 font-medium">Shipment ID</span>
              <span className="font-mono text-gray-900 break-all text-right ml-4">{result.shipment_id}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500 font-medium">Tracking Number</span>
              <span className="font-mono text-gray-900">{result.tracking_number || '—'}</span>
            </div>
            {result.shipment_cost?.amount != null && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500 font-medium">Label Cost</span>
                <span className="font-semibold text-gray-900">
                  {(result.shipment_cost.currency || 'usd').toUpperCase()} ${Number(result.shipment_cost.amount).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {result.label_download?.href && (
            <a
              href={result.label_download.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors text-sm"
            >
              <span className="font-medium">Download Label ({result.label_format?.toUpperCase() || 'PDF'})</span>
              <span>↗</span>
            </a>
          )}

          {!labelVoided && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleVoid}
                disabled={voidLoading}
                className="btn-danger"
              >
                {voidLoading ? 'Voiding...' : 'Void Label'}
              </button>
              <button onClick={() => goToStep(4)} className="btn-primary">
                Track Shipment →
              </button>
            </div>
          )}

          {labelVoided && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
              Label has been voided.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
