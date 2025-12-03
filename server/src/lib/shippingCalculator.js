const logger = require('./logger');

/**
 * Shipping Calculator Service
 * Calculates shipping costs based on distance, weight, and delivery options
 */

// Shipping rate configurations
const SHIPPING_RATES = {
  standard: {
    baseRate: 5.00,
    perKmRate: 0.15,
    perKgRate: 0.50,
    minWeight: 0,
    maxWeight: 30,
    estimatedDays: 5-7,
    zones: {
      local: { multiplier: 1.0, maxDistance: 50 },
      regional: { multiplier: 1.3, maxDistance: 200 },
      national: { multiplier: 1.8, maxDistance: Infinity },
    },
  },
  express: {
    baseRate: 12.00,
    perKmRate: 0.25,
    perKgRate: 0.80,
    minWeight: 0,
    maxWeight: 25,
    estimatedDays: 2-3,
    zones: {
      local: { multiplier: 1.0, maxDistance: 50 },
      regional: { multiplier: 1.4, maxDistance: 200 },
      national: { multiplier: 2.2, maxDistance: Infinity },
    },
  },
  overnight: {
    baseRate: 25.00,
    perKmRate: 0.40,
    perKgRate: 1.20,
    minWeight: 0,
    maxWeight: 15,
    estimatedDays: 1,
    zones: {
      local: { multiplier: 1.0, maxDistance: 50 },
      regional: { multiplier: 1.5, maxDistance: 200 },
      national: { multiplier: 2.5, maxDistance: 500 }, // Limited national coverage
    },
  },
  free: {
    baseRate: 0,
    perKmRate: 0,
    perKgRate: 0,
    minWeight: 0,
    maxWeight: 50,
    estimatedDays: 7-10,
    zones: {
      local: { multiplier: 1.0, maxDistance: 10 }, // Only very local
      regional: { multiplier: 0, maxDistance: 0 }, // Not available
      national: { multiplier: 0, maxDistance: 0 }, // Not available
    },
  },
};

/**
 * Calculate shipping cost
 * @param {Object} params - Shipping parameters
 * @param {number} params.distance - Distance in km
 * @param {number} params.weight - Weight in kg
 * @param {string} params.shippingMethod - 'standard', 'express', 'overnight', 'free'
 * @param {string} params.zone - 'local', 'regional', 'national'
 * @returns {Object} Shipping calculation result
 */
exports.calculateShippingCost = (params) => {
  try {
    const { distance, weight, shippingMethod = 'standard', zone } = params;

    // Validate inputs
    if (distance < 0 || weight < 0) {
      throw new Error('Distance and weight must be positive numbers');
    }

    if (!SHIPPING_RATES[shippingMethod]) {
      throw new Error(`Invalid shipping method: ${shippingMethod}`);
    }

    const rateConfig = SHIPPING_RATES[shippingMethod];

    // Check weight limits
    if (weight > rateConfig.maxWeight) {
      return {
        available: false,
        reason: `Weight exceeds maximum limit of ${rateConfig.maxWeight}kg for ${shippingMethod} shipping`,
        maxWeight: rateConfig.maxWeight,
      };
    }

    // Determine zone based on distance if not provided
    let shippingZone = zone;
    if (!shippingZone) {
      if (distance <= 50) {
        shippingZone = 'local';
      } else if (distance <= 200) {
        shippingZone = 'regional';
      } else {
        shippingZone = 'national';
      }
    }

    const zoneConfig = rateConfig.zones[shippingZone];

    // Check if shipping is available for this zone
    if (!zoneConfig || distance > zoneConfig.maxDistance) {
      return {
        available: false,
        reason: `${shippingMethod} shipping not available for distances over ${zoneConfig?.maxDistance || 0}km`,
        maxDistance: zoneConfig?.maxDistance || 0,
      };
    }

    // Calculate base cost
    let cost = rateConfig.baseRate;

    // Add distance cost
    cost += distance * rateConfig.perKmRate;

    // Add weight cost
    cost += weight * rateConfig.perKgRate;

    // Apply zone multiplier
    cost *= zoneConfig.multiplier;

    // Round to 2 decimal places
    cost = Math.round(cost * 100) / 100;

    // Calculate estimated delivery date
    const estimatedDaysMin = Array.isArray(rateConfig.estimatedDays) 
      ? rateConfig.estimatedDays[0] 
      : rateConfig.estimatedDays;
    const estimatedDaysMax = Array.isArray(rateConfig.estimatedDays) 
      ? rateConfig.estimatedDays[1] 
      : rateConfig.estimatedDays;

    const estimatedDeliveryMin = new Date();
    estimatedDeliveryMin.setDate(estimatedDeliveryMin.getDate() + estimatedDaysMin);
    
    const estimatedDeliveryMax = new Date();
    estimatedDeliveryMax.setDate(estimatedDeliveryMax.getDate() + estimatedDaysMax);

    return {
      available: true,
      cost,
      method: shippingMethod,
      zone: shippingZone,
      breakdown: {
        baseRate: rateConfig.baseRate,
        distanceCost: Math.round(distance * rateConfig.perKmRate * 100) / 100,
        weightCost: Math.round(weight * rateConfig.perKgRate * 100) / 100,
        zoneMultiplier: zoneConfig.multiplier,
      },
      estimatedDays: {
        min: estimatedDaysMin,
        max: estimatedDaysMax,
      },
      estimatedDelivery: {
        min: estimatedDeliveryMin.toISOString().split('T')[0],
        max: estimatedDeliveryMax.toISOString().split('T')[0],
      },
    };
  } catch (error) {
    logger.error('Shipping calculation error:', { error: error.message, params });
    throw error;
  }
};

/**
 * Get all available shipping options for given parameters
 * @param {Object} params - Shipping parameters
 * @param {number} params.distance - Distance in km
 * @param {number} params.weight - Weight in kg
 * @param {number} params.orderValue - Order value for free shipping eligibility
 * @returns {Array} Array of available shipping options
 */
exports.getAvailableShippingOptions = (params) => {
  const { distance, weight, orderValue = 0 } = params;

  const options = [];

  // Check each shipping method
  for (const [method, config] of Object.entries(SHIPPING_RATES)) {
    // Skip free shipping if order value is less than $50 or distance > 10km
    if (method === 'free' && (orderValue < 50 || distance > 10)) {
      continue;
    }

    const result = exports.calculateShippingCost({
      distance,
      weight,
      shippingMethod: method,
    });

    if (result.available) {
      options.push({
        method,
        displayName: getShippingMethodDisplayName(method),
        ...result,
      });
    }
  }

  // Sort by cost (cheapest first)
  options.sort((a, b) => a.cost - b.cost);

  return options;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {Object} from - Starting coordinates
 * @param {number} from.lat - Latitude
 * @param {number} from.lng - Longitude
 * @param {Object} to - Destination coordinates
 * @param {number} to.lat - Latitude
 * @param {number} to.lng - Longitude
 * @returns {number} Distance in kilometers
 */
exports.calculateDistance = (from, to) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees
 * @returns {number} Radians
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get display name for shipping method
 * @param {string} method - Shipping method
 * @returns {string} Display name
 */
function getShippingMethodDisplayName(method) {
  const names = {
    standard: 'Standard Shipping',
    express: 'Express Shipping',
    overnight: 'Overnight Delivery',
    free: 'Free Shipping',
  };
  return names[method] || method;
}

/**
 * Estimate delivery time based on current date and business days
 * @param {number} businessDays - Number of business days
 * @returns {Date} Estimated delivery date
 */
exports.estimateDeliveryDate = (businessDays) => {
  const date = new Date();
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    date.setDate(date.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      daysAdded++;
    }
  }

  return date;
};

/**
 * Validate shipping address
 * @param {Object} address - Shipping address
 * @returns {Object} Validation result
 */
exports.validateAddress = (address) => {
  const errors = [];

  if (!address.street || address.street.trim().length < 5) {
    errors.push('Street address must be at least 5 characters');
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.push('City is required');
  }

  if (!address.postalCode || !/^[A-Z0-9\s-]{3,10}$/i.test(address.postalCode)) {
    errors.push('Valid postal code is required');
  }

  if (!address.country || address.country.trim().length < 2) {
    errors.push('Country is required');
  }

  // Optional: Add geocoding validation here
  // Check if address can be geocoded to lat/lng coordinates

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Generate tracking number
 * @param {string} orderId - Order ID
 * @param {string} shippingMethod - Shipping method
 * @returns {string} Tracking number
 */
exports.generateTrackingNumber = (orderId, shippingMethod) => {
  const prefix = {
    standard: 'STD',
    express: 'EXP',
    overnight: 'OVN',
    free: 'FRE',
  }[shippingMethod] || 'SHP';

  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderSuffix = orderId.substring(0, 8).toUpperCase();

  return `${prefix}-${timestamp}-${random}-${orderSuffix}`;
};

module.exports = exports;
