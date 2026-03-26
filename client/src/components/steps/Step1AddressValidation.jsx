import React, { useState } from 'react';
import { useFlow } from '../../context/FlowContext';
import { validateAddress } from '../../api/shipstation';

const initialForm = {
  name: 'John Doe',
  address_line1: '1600 Pennsylvania Ave NW',
  city_locality: 'Washington',
  state_province: 'DC',
  postal_code: '20500',
  country_code: 'US',
};

function StatusBadge({ status }) {
  if (status === 'verified') {
    return <span className="badge-success">✅ Verified</span>;
  }
  if (status === 'warning') {
    return <span className="badge-warning">⚠️ Warning</span>;
  }
  return <span className="badge-error">❌ Unverified</span>;
}

export default function Step1AddressValidation() {
  const { setValidatedAddress, goToStep, updateChecklist } = useFlow();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await validateAddress([form]);
      const first = Array.isArray(data) ? data[0] : data;
      setResult(first);

      const status = first?.status;
      if (status === 'verified' || status === 'warning') {
        setValidatedAddress(first?.matched_address || form);
        updateChecklist('addressValid', 'pass');
      } else {
        updateChecklist('addressValid', 'fail');
        updateChecklist('addressInvalid', 'pass');
      }
    } catch (err) {
      if (err.isRateLimited) {
        setError(`Rate limited. Retry after ${err.retryAfter}s`);
        updateChecklist('rateLimitHandling', 'pass');
      } else {
        setError(err.response?.data?.error || err.message);
      }
      updateChecklist('addressValid', 'fail');
    } finally {
      setLoading(false);
    }
  }

  const canProceed = result && (result.status === 'verified' || result.status === 'warning');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Step 1 — Address Validation</h1>
        <p className="text-gray-500 mt-1 text-sm">Validate a shipping address before creating a shipment.</p>
      </div>

      <form onSubmit={handleSubmit} className="step-card space-y-4">
        <h2 className="section-title">Address Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label-text">Full Name</label>
            <input className="input-field" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
          </div>
          <div className="col-span-2">
            <label className="label-text">Address Line 1</label>
            <input className="input-field" name="address_line1" value={form.address_line1} onChange={handleChange} placeholder="123 Main St" required />
          </div>
          <div>
            <label className="label-text">City</label>
            <input className="input-field" name="city_locality" value={form.city_locality} onChange={handleChange} placeholder="San Francisco" required />
          </div>
          <div>
            <label className="label-text">State</label>
            <input className="input-field" name="state_province" value={form.state_province} onChange={handleChange} placeholder="CA" required />
          </div>
          <div>
            <label className="label-text">Postal Code</label>
            <input className="input-field" name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="94105" required />
          </div>
          <div>
            <label className="label-text">Country Code</label>
            <input className="input-field" name="country_code" value={form.country_code} onChange={handleChange} placeholder="US" maxLength={2} required />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? 'Validating...' : 'Validate Address'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="step-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0">Validation Result</h2>
            <StatusBadge status={result.status} />
          </div>

          {result.matched_address && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium text-gray-700">Matched Address</p>
              <p className="text-gray-600">{result.matched_address.address_line1}</p>
              <p className="text-gray-600">
                {result.matched_address.city_locality}, {result.matched_address.state_province} {result.matched_address.postal_code}
              </p>
              <p className="text-gray-600">{result.matched_address.country_code}</p>
            </div>
          )}

          {result.messages && result.messages.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Messages</p>
              {result.messages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="text-yellow-600">⚠</span>
                  <span className="text-yellow-800">{msg.message}</span>
                </div>
              ))}
            </div>
          )}

          {canProceed && (
            <button onClick={() => goToStep(2)} className="btn-primary">
              Proceed to Rates →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
