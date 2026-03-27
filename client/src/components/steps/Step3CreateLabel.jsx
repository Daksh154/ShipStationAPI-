import React, { useState, useEffect } from 'react';
import { useFlow } from '../../context/FlowContext';
import { createLabel, voidLabel } from '../../api/shipstation';
import {
  DEFAULT_SHIP_FROM,
  DEFAULT_SHIP_TO_FALLBACK,
  shipToFromValidatedAddress,
} from '../../constants/demoAddresses';

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

  const [shipFrom, setShipFrom] = useState(() => ({ ...DEFAULT_SHIP_FROM }));
  const [shipTo, setShipTo] = useState(() => ({ ...DEFAULT_SHIP_TO_FALLBACK }));

  useEffect(() => {
    if (validatedAddress) {
      setShipTo(shipToFromValidatedAddress(validatedAddress));
    } else {
      setShipTo({ ...DEFAULT_SHIP_TO_FALLBACK });
    }
  }, [validatedAddress]);

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

  function handleShipToChange(e) {
    setShipTo((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

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
          <div>
            <h2 className="section-title">Ship From</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label-text">Name</label>
                <input className="input-field" name="name" value={shipFrom.name} onChange={handleShipFromChange} required />
              </div>
              <div className="col-span-2">
                <label className="label-text">Company</label>
                <input className="input-field" name="company_name" value={shipFrom.company_name} onChange={handleShipFromChange} />
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
                <label className="label-text">Country</label>
                <input className="input-field" name="country_code" value={shipFrom.country_code} onChange={handleShipFromChange} maxLength={2} required />
              </div>
              <div>
                <label className="label-text">Phone</label>
                <input className="input-field" name="phone" value={shipFrom.phone} onChange={handleShipFromChange} required />
              </div>
              <div>
                <label className="label-text">Residential</label>
                <select
                  className="input-field"
                  name="address_residential_indicator"
                  value={shipFrom.address_residential_indicator}
                  onChange={handleShipFromChange}
                >
                  <option value="no">No (commercial)</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="section-title mb-0">Ship To</h2>
              {validatedAddress && (
                <span className="text-xs text-blue-600 font-medium">Prefilled from Step 1 — editable</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label-text">Name</label>
                <input className="input-field" name="name" value={shipTo.name} onChange={handleShipToChange} required />
              </div>
              <div className="col-span-2">
                <label className="label-text">Address</label>
                <input className="input-field" name="address_line1" value={shipTo.address_line1} onChange={handleShipToChange} required />
              </div>
              <div>
                <label className="label-text">City</label>
                <input className="input-field" name="city_locality" value={shipTo.city_locality} onChange={handleShipToChange} required />
              </div>
              <div>
                <label className="label-text">State</label>
                <input className="input-field" name="state_province" value={shipTo.state_province} onChange={handleShipToChange} required />
              </div>
              <div>
                <label className="label-text">Postal Code</label>
                <input className="input-field" name="postal_code" value={shipTo.postal_code} onChange={handleShipToChange} required />
              </div>
              <div>
                <label className="label-text">Country</label>
                <input className="input-field" name="country_code" value={shipTo.country_code} onChange={handleShipToChange} maxLength={2} required />
              </div>
              <div>
                <label className="label-text">Phone</label>
                <input className="input-field" name="phone" value={shipTo.phone} onChange={handleShipToChange} required />
              </div>
              <div>
                <label className="label-text">Residential</label>
                <select
                  className="input-field"
                  name="address_residential_indicator"
                  value={shipTo.address_residential_indicator}
                  onChange={handleShipToChange}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No (commercial)</option>
                </select>
              </div>
            </div>
          </div>

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
