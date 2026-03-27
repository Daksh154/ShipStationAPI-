import React, { useState, useEffect } from 'react';
import { useFlow } from '../../context/FlowContext';
import { getCarriers, createShipment, getShipmentRates, getRates, createLabel } from '../../api/shipstation';
import {
  DEFAULT_SHIP_FROM,
  DEFAULT_SHIP_TO_FALLBACK,
  shipToFromValidatedAddress,
} from '../../constants/demoAddresses';

function dedupeRates(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const key = getRateKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function getRateKey(rate) {
  if (rate?.rate_id) return `rate_id:${rate.rate_id}`;

  const carrier = rate?.carrier_id || rate?.carrier_code || '';
  const service = rate?.service_code || rate?.service_type || '';
  const amount = rate?.shipping_amount?.amount ?? rate?.shipment_cost?.amount ?? '';
  const currency = rate?.shipping_amount?.currency ?? rate?.shipment_cost?.currency ?? '';
  const packageType = rate?.package_type || rate?.package_code || '';
  return `fallback:${carrier}|${service}|${currency}|${amount}|${packageType}`;
}

export default function Step2Rates() {
  const {
    setSelectedRate,
    setCarrierId,
    setShipmentId,
    setLabelId,
    setTrackingNumber,
    shipmentId,
    goToStep,
    updateChecklist,
    validatedAddress,
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

  const [carriers, setCarriers] = useState([]);
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [carriersError, setCarriersError] = useState(null);

  const [form, setForm] = useState({
    carrier_id: '',
    weight_lbs: '2',
    length: '12',
    width: '8',
    height: '4',
  });

  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [labelCreating, setLabelCreating] = useState(false);
  const [shipmentDraft, setShipmentDraft] = useState(null);

  useEffect(() => {
    async function loadCarriers() {
      try {
        const data = await getCarriers();
        const list = data?.carriers || [];
        setCarriers(list);
        if (list.length > 0) {
          setForm((prev) => ({ ...prev, carrier_id: list[0].carrier_id }));
        }
      } catch (err) {
        setCarriersError(err.response?.data?.message || err.message);
      } finally {
        setCarriersLoading(false);
      }
    }
    loadCarriers();
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleShipFromChange(e) {
    const { name, value } = e.target;
    setShipFrom((prev) => ({ ...prev, [name]: value }));
  }

  function handleShipToChange(e) {
    const { name, value } = e.target;
    setShipTo((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRates([]);
    setSelectedId(null);
    setSelectedRate(null);
    setLabelId(null);
    setTrackingNumber(null);

    const packages = [
      {
        weight: {
          value: parseFloat(form.weight_lbs) || 1,
          unit: 'pound',
        },
        dimensions: {
          length: parseFloat(form.length) || 10,
          width: parseFloat(form.width) || 8,
          height: parseFloat(form.height) || 4,
          unit: 'inch',
        },
      },
    ];

    const shipmentBody = {
      shipments: [
        {
          validate_address: 'validate_and_clean',
          carrier_id: form.carrier_id,
          service_code: null,
          ship_from: shipFrom,
          ship_to: shipTo,
          packages,
        },
      ],
    };

    try {
      setShipmentDraft({ shipFrom, shipTo, packages });
      const shipmentRes = await createShipment(shipmentBody);
      const shipment =
        shipmentRes?.shipment
        || shipmentRes?.shipments?.[0]
        || shipmentRes?.shipments_response?.shipments?.[0]
        || shipmentRes?.data?.shipments?.[0]
        || shipmentRes;
      const currentShipmentId = shipment?.shipment_id || shipmentRes?.shipment_id;
      setShipmentId(currentShipmentId || null);
      if (!currentShipmentId) {
        throw new Error('Shipment created but shipment_id is missing.');
      }
      const shipmentRatesData = await getShipmentRates(currentShipmentId);
      let rateList = shipmentRatesData?.rates
        || shipmentRatesData?.rate_response?.rates
        || (Array.isArray(shipmentRatesData) ? shipmentRatesData : []);

      if (rateList.length === 0) {
        const estimateBody = {
          carrier_ids: [form.carrier_id],
          from_postal_code: shipFrom.postal_code,
          to_postal_code: shipTo.postal_code,
          to_country_code: shipTo.country_code || 'US',
          from_country_code: shipFrom.country_code || 'US',
          weight: packages[0].weight,
          dimensions: packages[0].dimensions,
        };
        const estimateData = await getRates(estimateBody);
        const estimateList = estimateData?.rate_response?.rates
          || estimateData?.rates
          || (Array.isArray(estimateData) ? estimateData : []);
        if (estimateList.length > 0) {
          rateList = estimateList;
        }
      }

      const uniqueRates = dedupeRates(rateList);
      setRates(uniqueRates);
      if (uniqueRates.length > 0) {
        updateChecklist('rateFetching', 'pass');
      } else {
        updateChecklist('rateFetching', 'fail');
        setError('No rates returned from shipment rates or estimates. Check your carrier ID and postal codes.');
      }
    } catch (err) {
      if (err.isRateLimited) {
        setError(`Rate limited. Retry after ${err.retryAfter}s`);
        updateChecklist('rateLimitHandling', 'pass');
      } else {
        setError(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || err.message);
      }
      updateChecklist('rateFetching', 'fail');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(rate) {
    const nextId = getRateKey(rate);
    if (!nextId) return;

    if (selectedId === nextId) {
      setSelectedId(null);
      setSelectedRate(null);
      setCarrierId(null);
      return;
    }

    setSelectedId(nextId);
    setSelectedRate({
      rate_id: rate.rate_id,
      service_code: rate.service_code,
      carrier_id: rate.carrier_id,
      rate: rate.shipping_amount?.amount ?? 0,
      service_type: rate.service_type || rate.service_code,
      carrier_friendly_name: rate.carrier_friendly_name || rate.carrier_code || rate.carrier_id,
    });
    setCarrierId(rate.carrier_id);
  }

  async function handleContinue() {
    if (!shipmentDraft || !shipmentId || !selectedId) {
      setError('Missing shipment, rate, or package details. Please fetch rates and select a rate first.');
      return;
    }

    const rate = rates.find((r) => getRateKey(r) === selectedId);
    if (!rate) {
      setError('Selected rate not found. Please select a rate again.');
      return;
    }

    setLabelCreating(true);
    setError(null);
    try {
      const body = {
        test_label: true,
        shipment_id: shipmentId,
        rate_id: rate.rate_id || null,
        selected_rate_amount: rate.shipping_amount?.amount ?? null,
        carrier_id: rate.carrier_id || '',
        service_code: rate.service_code || '',
        ship_from: shipFrom,
        ship_to: shipTo,
        packages: shipmentDraft.packages,
        label_format: 'pdf',
        label_layout: '4x6',
      };

      const data = await createLabel(body);
      const rawLabelId = typeof data?.label_id === 'string' ? data.label_id : null;
      setLabelId(rawLabelId);
      setTrackingNumber(data?.tracking_number || null);
      updateChecklist('labelCreate', 'pass');
      goToStep(3);
    } catch (err) {
      if (err.isRateLimited) {
        setError(`Rate limited. Retry after ${err.retryAfter}s`);
        updateChecklist('rateLimitHandling', 'pass');
      } else {
        setError(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || err.message);
      }
      updateChecklist('labelCreate', 'fail');
    } finally {
      setLabelCreating(false);
    }
  }

  function formatRate(rate) {
    const amount = rate.shipping_amount?.amount;
    const currency = (rate.shipping_amount?.currency || 'usd').toUpperCase();
    if (typeof amount === 'number') return `${currency} $${amount.toFixed(2)}`;
    return '—';
  }

  const selectedCarrier = carriers.find((c) => c.carrier_id === form.carrier_id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Step 2 — Create Shipment & Get Rates</h1>
        <p className="text-gray-500 mt-1 text-sm">Create a shipment first, then fetch rates for that shipment.</p>
      </div>

      <div className="step-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title mb-0">Your Carrier Accounts</h2>
          {carriersLoading && <span className="text-xs text-gray-400 animate-pulse">Loading carriers...</span>}
        </div>
        {carriersError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{carriersError}</div>
        )}
        {!carriersLoading && carriers.length === 0 && !carriersError && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            No carriers found on your ShipStation account.
          </div>
        )}
        {carriers.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {carriers.map((c) => (
              <div
                key={c.carrier_id}
                className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                  form.carrier_id === c.carrier_id
                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setForm((prev) => ({ ...prev, carrier_id: c.carrier_id }))}
              >
                <p className="font-semibold">{c.friendly_name || c.carrier_code}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{c.carrier_id}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="step-card space-y-6">
        <h2 className="section-title">Addresses & package</h2>

        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Ship from</h3>
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
              <label className="label-text">Address line 1</label>
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
              <label className="label-text">Postal code</label>
              <input className="input-field" name="postal_code" value={shipFrom.postal_code} onChange={handleShipFromChange} required />
            </div>
            <div>
              <label className="label-text">Country code</label>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Ship to</h3>
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
              <label className="label-text">Address line 1</label>
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
              <label className="label-text">Postal code</label>
              <input className="input-field" name="postal_code" value={shipTo.postal_code} onChange={handleShipToChange} required />
            </div>
            <div>
              <label className="label-text">Country code</label>
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
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Package</h3>
          {selectedCarrier && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-3">
              Selected carrier: <span className="font-semibold">{selectedCarrier.friendly_name || selectedCarrier.carrier_code}</span>
              <span className="font-mono ml-2 text-xs text-blue-600">({form.carrier_id})</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Weight (lbs)</label>
              <input className="input-field" type="number" name="weight_lbs" value={form.weight_lbs} onChange={handleChange} min="0.1" step="0.1" required />
            </div>
            <div>
              <label className="label-text">Length (in)</label>
              <input className="input-field" type="number" name="length" value={form.length} onChange={handleChange} min="1" required />
            </div>
            <div>
              <label className="label-text">Width (in)</label>
              <input className="input-field" type="number" name="width" value={form.width} onChange={handleChange} min="1" required />
            </div>
            <div>
              <label className="label-text">Height (in)</label>
              <input className="input-field" type="number" name="height" value={form.height} onChange={handleChange} min="1" required />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading || labelCreating || !form.carrier_id} className="btn-primary w-full justify-center">
          {loading ? 'Creating Shipment & Fetching Rates...' : 'Create Shipment & Get Rates'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {rates.length > 0 && (
        <div className="step-card">
          <h2 className="section-title">Available Rates ({rates.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Carrier</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Service</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Rate</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate, i) => {
                  const isSelected = selectedId === getRateKey(rate);
                  return (
                    <tr
                      key={rate.rate_id || i}
                      className={`border-b border-gray-100 last:border-0 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {rate.carrier_friendly_name || rate.carrier_code || rate.carrier_id}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{rate.service_type || rate.service_code}</td>
                      <td className="py-3 pr-4 font-semibold text-gray-900">{formatRate(rate)}</td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => handleSelect(rate)}
                          disabled={labelCreating}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {isSelected ? 'Selected ✓' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedId && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <button type="button" onClick={handleContinue} disabled={labelCreating} className="btn-primary">
                {labelCreating ? 'Creating Label...' : 'Continue →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
