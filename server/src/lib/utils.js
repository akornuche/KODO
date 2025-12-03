/**
 * Utility Functions
 */

/**
 * Generate unique reference code
 * @param {string} prefix - Reference prefix (e.g., 'DEP', 'WTH', 'TRF')
 * @returns {string} Unique reference
 */
exports.generateReference = (prefix = 'REF') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Generate unique ticket number
 * @returns {string} Ticket number
 */
exports.generateTicketNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${year}${month}-${random}`;
};

/**
 * Generate unique invoice number
 * @returns {string} Invoice number
 */
exports.generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}${day}-${random}`;
};

/**
 * Calculate tax amount
 * @param {number} amount - Amount before tax
 * @param {number} taxRate - Tax rate as decimal (e.g., 0.075 for 7.5%)
 * @returns {object} Tax breakdown
 */
exports.calculateTax = (amount, taxRate = 0.075) => {
  const taxAmount = amount * taxRate;
  const totalAmount = amount + taxAmount;
  
  return {
    subtotal: amount,
    taxRate,
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};

/**
 * Get tax rate by region (Nigeria states)
 * @param {string} state - Nigerian state
 * @returns {number} Tax rate
 */
exports.getTaxRateByRegion = (state) => {
  // Nigeria VAT is 7.5% nationwide as of 2020
  // This can be expanded for different states or countries
  const taxRates = {
    default: 0.075, // 7.5% VAT
  };
  
  return taxRates[state?.toLowerCase()] || taxRates.default;
};

/**
 * Calculate seller commission (flat rate - tier system disabled)
 * @param {number} amount - Order amount
 * @param {string} tier - Seller tier (currently unused)
 * @returns {object} Commission breakdown
 */
exports.calculateCommission = (amount, tier = 'bronze') => {
  // Flat commission rate - tier system disabled
  const rate = 0.10; // 10% flat commission for all sellers
  
  const commissionAmount = amount * rate;
  const sellerReceives = amount - commissionAmount;
  
  return {
    grossAmount: amount,
    commissionRate: rate,
    commissionAmount: parseFloat(commissionAmount.toFixed(2)),
    netAmount: parseFloat(sellerReceives.toFixed(2)),
    tier: 'N/A', // Tier system disabled
  };
};

/**
 * Determine seller tier based on performance
 * @param {number} totalSales - Total number of sales
 * @param {number} rating - Average seller rating
 * @returns {string} Seller tier
 */
exports.determineSellerTier = (totalSales, rating = 0) => {
  if (totalSales >= 1000 && rating >= 4.8) return 'platinum';
  if (totalSales >= 500 && rating >= 4.5) return 'gold';
  if (totalSales >= 100 && rating >= 4.0) return 'silver';
  return 'bronze';
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
exports.formatCurrency = (amount, currency = 'NGN') => {
  const symbols = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Slugify string
 * @param {string} text - Text to slugify
 * @returns {string} Slugified text
 */
exports.slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
exports.truncate = (text, length = 100) => {
  if (!text || text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * Generate SKU
 * @param {string} category - Product category
 * @param {string} productId - Product ID
 * @returns {string} SKU
 */
exports.generateSKU = (category, productId) => {
  const categoryCode = category?.substring(0, 3).toUpperCase() || 'GEN';
  const idPart = productId?.substring(0, 8).toUpperCase() || Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${categoryCode}-${idPart}`;
};

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
exports.isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Check if phone number is valid (Nigerian format)
 * @param {string} phone - Phone number
 * @returns {boolean} Is valid
 */
exports.isValidPhoneNumber = (phone) => {
  // Nigerian phone numbers: +234XXXXXXXXXX or 0XXXXXXXXXX
  const re = /^(\+234|0)[789]\d{9}$/;
  return re.test(phone);
};

/**
 * Sanitize HTML
 * @param {string} html - HTML string
 * @returns {string} Sanitized HTML
 */
exports.sanitizeHtml = (html) => {
  if (!html) return '';
  
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
};

module.exports = exports;
