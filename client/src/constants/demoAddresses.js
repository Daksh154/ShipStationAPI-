/** Default ship-from (origin) — prefilled in Step 2 / Step3CreateLabel */
export const DEFAULT_SHIP_FROM = {
  name: 'My Store',
  company_name: 'My Store Inc.',
  phone: '+1 512-555-1234',
  address_line1: '4009 Marathon Blvd',
  city_locality: 'Austin',
  state_province: 'TX',
  postal_code: '78756',
  country_code: 'US',
  address_residential_indicator: 'no',
};

/** Ship-to when Step 1 was skipped — editable defaults */
export const DEFAULT_SHIP_TO_FALLBACK = {
  name: 'Jane Doe',
  phone: '+1 202-555-1234',
  address_line1: '525 S Winchester Blvd',
  city_locality: 'San Jose',
  state_province: 'CA',
  postal_code: '95128',
  country_code: 'US',
  address_residential_indicator: 'yes',
};

/** Step 1 form initial values (ship-to capture) */
export const STEP1_INITIAL_FORM = {
  name: 'John Doe',
  phone: '+1 202-555-1234',
  address_line1: '1600 Pennsylvania Ave NW',
  city_locality: 'Washington',
  state_province: 'DC',
  postal_code: '20500',
  country_code: 'US',
};

/** Map Step 1 saved address into API ship_to shape */
export function shipToFromValidatedAddress(addr) {
  return {
    name: addr.name || 'Recipient',
    phone: addr.phone || '+1 202-555-1234',
    address_line1: addr.address_line1,
    city_locality: addr.city_locality,
    state_province: addr.state_province,
    postal_code: addr.postal_code,
    country_code: addr.country_code || 'US',
    address_residential_indicator: 'yes',
  };
}
