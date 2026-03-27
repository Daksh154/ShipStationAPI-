import React, { useState } from 'react';
import { useFlow } from '../../context/FlowContext';
import { STEP1_INITIAL_FORM } from '../../constants/demoAddresses';

export default function Step1AddressValidation() {
  const { setValidatedAddress, goToStep, updateChecklist } = useFlow();
  const [form, setForm] = useState(STEP1_INITIAL_FORM);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setValidatedAddress(form);
    updateChecklist('addressValid', 'pass');
    goToStep(2);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Step 1 — Ship-to address</h1>
        <p className="text-gray-500 mt-1 text-sm">Enter the destination address for rates and labels in later steps.</p>
      </div>

      <form onSubmit={handleSubmit} className="step-card space-y-4">
        <h2 className="section-title">Address details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label-text">Full name</label>
            <input className="input-field" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
          </div>
          <div className="col-span-2">
            <label className="label-text">Phone</label>
            <input className="input-field" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555-555-5555" />
          </div>
          <div className="col-span-2">
            <label className="label-text">Address line 1</label>
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
            <label className="label-text">Postal code</label>
            <input className="input-field" name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="94105" required />
          </div>
          <div>
            <label className="label-text">Country code</label>
            <input className="input-field" name="country_code" value={form.country_code} onChange={handleChange} placeholder="US" maxLength={2} required />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full justify-center">
          Continue to rates →
        </button>
      </form>
    </div>
  );
}
