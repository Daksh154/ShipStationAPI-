/**
 * @typedef {Object} Address
 * @property {string} name
 * @property {string} address_line1
 * @property {string} [address_line2]
 * @property {string} city_locality
 * @property {string} state_province
 * @property {string} postal_code
 * @property {string} country_code
 * @property {string} [phone]
 */

/**
 * @typedef {Object} AddressValidationResult
 * @property {'verified'|'unverified'|'warning'|'error'} status
 * @property {Address} matched_address
 * @property {Array<{code: string, message: string, type: string, detail_code: string}>} messages
 */

/**
 * @typedef {Object} Weight
 * @property {number} value
 * @property {'pound'|'ounce'|'gram'|'kilogram'} unit
 */

/**
 * @typedef {Object} Dimensions
 * @property {number} length
 * @property {number} width
 * @property {number} height
 * @property {'inch'|'centimeter'} unit
 */

/**
 * @typedef {Object} RateOption
 * @property {string} rate_id
 * @property {string} rate_type
 * @property {string} carrier_id
 * @property {string} shipping_amount
 * @property {string} insurance_amount
 * @property {string} confirmation_amount
 * @property {string} other_amount
 * @property {string} service_code
 * @property {string} service_type
 * @property {string} carrier_code
 * @property {string} carrier_friendly_name
 * @property {string} [estimated_delivery_date]
 * @property {number} [delivery_days]
 * @property {{ currency: string, amount: number }} shipping_amount
 */

/**
 * @typedef {Object} Shipment
 * @property {string} shipment_id
 * @property {string} shipment_status
 * @property {string} carrier_id
 * @property {string} service_code
 * @property {Address} ship_from
 * @property {Address} ship_to
 */

/**
 * @typedef {Object} Label
 * @property {string} label_id
 * @property {string} status
 * @property {string} shipment_id
 * @property {string} tracking_number
 * @property {{ href: string, type: string }} label_download
 * @property {string} [voided_at]
 * @property {boolean} voided
 */

/**
 * @typedef {Object} TrackingEvent
 * @property {string} occurred_at
 * @property {string} carrier_occurred_at
 * @property {string} description
 * @property {string} city_locality
 * @property {string} state_province
 * @property {string} postal_code
 * @property {string} country_code
 * @property {string} company_name
 * @property {string} signer
 * @property {string} event_code
 * @property {string} status_code
 * @property {string} status_description
 * @property {string} carrier_status_code
 * @property {string} carrier_detail_code
 */

/**
 * @typedef {Object} TrackingInfo
 * @property {string} tracking_number
 * @property {string} status_code
 * @property {string} status_description
 * @property {string} [estimated_delivery_date]
 * @property {TrackingEvent[]} events
 */

/**
 * @typedef {'pending'|'pass'|'fail'} CheckStatus
 *
 * @typedef {Object} ChecklistStatus
 * @property {CheckStatus} addressValid
 * @property {CheckStatus} addressInvalid
 * @property {CheckStatus} rateFetching
 * @property {CheckStatus} shipmentCreation
 * @property {CheckStatus} labelPurchase
 * @property {CheckStatus} labelVoid
 * @property {CheckStatus} webhookRegistration
 * @property {CheckStatus} webhookReceipt
 * @property {CheckStatus} trackingUpdates
 * @property {CheckStatus} rateLimitHandling
 */

/**
 * @typedef {Object} FlowState
 * @property {Address|null} validatedAddress
 * @property {{ service_code: string, carrier_id: string, rate: number, service_type: string, carrier_friendly_name: string }|null} selectedRate
 * @property {string|null} shipmentId
 * @property {string|null} labelId
 * @property {string|null} trackingNumber
 * @property {ChecklistStatus} checklistStatus
 * @property {number} activeStep
 */

export {};
