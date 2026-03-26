import React, { useState, useEffect } from 'react';
import { useFlow } from '../../context/FlowContext';
import { getCarriers, createShipment, getShipmentRates } from '../../api/shipstation';

export default function Step2Rates() {
  const { setSelectedRate, setCarrierId, setShipmentId, goToStep, updateChecklist, validatedAddress } = useFlow();

  const [carriers, setCarriers] = useState([]);
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [carriersError, setCarriersError] = useState(null);

  const [form, setForm] = useState({
    carrier_id: '',
    from_postal_code: '78756',
    to_postal_code: validatedAddress?.postal_code || '90210',
    weight_lbs: '2',
    length: '12',
    width: '8',
    height: '4',
  });

  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRates([]);

    const shipFrom = {
      name: 'My Store',
      company_name: 'My Store Inc.',
      phone: '+1 512-555-1234',
      address_line1: '4009 Marathon Blvd',
      city_locality: 'Austin',
      state_province: 'TX',
      postal_code: form.from_postal_code,
      country_code: 'US',
      address_residential_indicator: 'no',
    };

    const shipTo = validatedAddress
      ? {
          name: validatedAddress.name || 'Recipient',
          address_line1: validatedAddress.address_line1,
          city_locality: validatedAddress.city_locality,
          state_province: validatedAddress.state_province,
          postal_code: validatedAddress.postal_code || form.to_postal_code,
          country_code: validatedAddress.country_code || 'US',
          address_residential_indicator: 'yes',
        }
      : {
          name: 'Jane Doe',
          address_line1: '525 S Winchester Blvd',
          city_locality: 'San Jose',
          state_province: 'CA',
          postal_code: form.to_postal_code,
          country_code: 'US',
          address_residential_indicator: 'yes',
        };

    const shipmentBody = {
      shipments: [
        {
          carrier_id: form.carrier_id,
          service_code: null,
          ship_from: shipFrom,
          ship_to: shipTo,
          packages: [
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
          ],
        },
      ],
    };

    try {
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
      const data = await getShipmentRates(currentShipmentId, form.carrier_id);
      const rateList = data?.rates || data?.rate_response?.rates || (Array.isArray(data) ? data : []);
      setRates(rateList);
      if (rateList.length > 0) {
        updateChecklist('rateFetching', 'pass');
      } else {
        updateChecklist('rateFetching', 'fail');
        setError('No rates returned. Check your carrier ID and postal codes.');
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
    setSelectedId(rate.rate_id || rate.service_code);
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

      {/* Carriers */}
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

      {/* Rate form */}
      <form onSubmit={handleSubmit} className="step-card space-y-4">
        <h2 className="section-title">Rate Request</h2>

        {selectedCarrier && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Selected carrier: <span className="font-semibold">{selectedCarrier.friendly_name || selectedCarrier.carrier_code}</span>
            <span className="font-mono ml-2 text-xs text-blue-600">({form.carrier_id})</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">From Postal Code</label>
            <input className="input-field" name="from_postal_code" value={form.from_postal_code} onChange={handleChange} placeholder="78756" required />
          </div>
          <div>
            <label className="label-text">To Postal Code</label>
            <input className="input-field" name="to_postal_code" value={form.to_postal_code} onChange={handleChange} placeholder="90210" required />
          </div>
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

        <button type="submit" disabled={loading || !form.carrier_id} className="btn-primary w-full justify-center">
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
                  const isSelected = selectedId === (rate.rate_id || rate.service_code);
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
                          onClick={() => handleSelect(rate)}
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
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => goToStep(3)} className="btn-primary">
                Proceed to Create Label →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
