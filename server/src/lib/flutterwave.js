const Flutterwave = require('flutterwave-node-v3');
const logger = require('./logger');

// Initialize Flutterwave with secret key (only if keys are provided)
let flutterwave = null;
if (process.env.FLUTTERWAVE_PUBLIC_KEY && process.env.FLUTTERWAVE_SECRET_KEY) {
  try {
    flutterwave = new Flutterwave(
      process.env.FLUTTERWAVE_PUBLIC_KEY,
      process.env.FLUTTERWAVE_SECRET_KEY
    );
    logger.info('Flutterwave initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Flutterwave:', error.message);
  }
} else {
  logger.warn('Flutterwave keys not configured, payment features disabled');
}

/**
 * Create a payment intent for an order using Flutterwave
 * @param {Object} options - Payment options
 * @param {number} options.amount - Amount in kobo (e.g., 459900 for ₦4,599.00)
 * @param {string} options.currency - Currency code (e.g., 'NGN')
 * @param {string} options.orderId - Order ID for metadata
 * @param {string} options.buyerId - Buyer user ID
 * @param {string} options.email - Buyer's email
 * @param {string} options.name - Buyer's name
 * @param {string} [options.phone] - Buyer's phone number
 * @param {string} [options.paymentMethod] - Payment method (card, mobilemoney, etc.)
 * @returns {Promise<Object>} Payment response object
 */
async function createPaymentIntent({
  amount,
  currency = 'NGN',
  orderId,
  buyerId,
  email,
  name,
  phone,
  paymentMethod = 'card'
}) {
  if (!flutterwave) {
    return simulatePayment({ amount, currency, orderId, buyerId, email });
  }

  try {
    const paymentData = {
      tx_ref: `KODO-${orderId}-${Date.now()}`,
      amount: Math.round(amount * 100), // Convert to kobo (smallest currency unit)
      currency,
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      payment_options: paymentMethod,
      customer: {
        email,
        name,
        phone_number: phone,
      },
      customizations: {
        title: 'KODO Marketplace Payment',
        description: `Payment for Order ${orderId}`,
        logo: `${process.env.FRONTEND_URL}/logo.png`,
      },
      meta: {
        orderId,
        buyerId,
        platform: 'KODO',
      },
    };

    const response = await flutterwave.Charge.create(paymentData);

    logger.info('Flutterwave payment initiated', {
      tx_ref: paymentData.tx_ref,
      orderId,
      amount: paymentData.amount,
      currency,
      status: response.status,
    });

    return {
      ...response,
      tx_ref: paymentData.tx_ref,
      payment_link: response.data?.link,
      flutterwave_ref: response.data?.flw_ref,
    };
  } catch (error) {
    logger.error('Create Flutterwave payment error:', {
      error: error.message,
      orderId,
      amount,
    });
    throw error;
  }
}

/**
 * Verify a payment using Flutterwave
 * @param {string} transactionId - Flutterwave transaction ID
 * @returns {Promise<Object>} Verification response
 */
async function verifyPayment(transactionId) {
  if (!flutterwave) {
    throw new Error('Flutterwave not configured');
  }

  try {
    const response = await flutterwave.Transaction.verify({ id: transactionId });

    logger.info('Payment verified', {
      transactionId,
      status: response.status,
      amount: response.data?.amount,
      currency: response.data?.currency,
    });

    return response;
  } catch (error) {
    logger.error('Verify payment error:', {
      error: error.message,
      transactionId,
    });
    throw error;
  }
}

/**
 * Create a transfer to seller (release escrow funds)
 * @param {Object} options - Transfer options
 * @param {number} options.amount - Amount in kobo
 * @param {string} options.currency - Currency code
 * @param {string} options.accountNumber - Seller's bank account number
 * @param {string} options.accountBank - Seller's bank code
 * @param {string} options.accountName - Seller's account name
 * @param {string} options.orderId - Order ID for metadata
 * @param {string} options.sellerId - Seller user ID
 * @returns {Promise<Object>} Transfer response
 */
async function createTransfer({
  amount,
  currency = 'NGN',
  accountNumber,
  accountBank,
  accountName,
  orderId,
  sellerId
}) {
  if (!flutterwave) {
    throw new Error('Flutterwave not configured');
  }

  try {
    const transferData = {
      account_bank: accountBank,
      account_number: accountNumber,
      amount: Math.round(amount * 100), // Convert to kobo
      currency,
      beneficiary_name: accountName,
      reference: `KODO-TRANSFER-${orderId}-${Date.now()}`,
      callback_url: `${process.env.BACKEND_URL}/api/payments/transfer-callback`,
      meta: {
        orderId,
        sellerId,
        platform: 'KODO',
      },
    };

    const response = await flutterwave.Transfer.initiate(transferData);

    logger.info('Flutterwave transfer initiated', {
      transferId: response.data?.id,
      orderId,
      amount: transferData.amount,
      destination: accountNumber,
      bank: accountBank,
    });

    return response;
  } catch (error) {
    logger.error('Create Flutterwave transfer error:', {
      error: error.message,
      orderId,
      amount,
      accountNumber,
      accountBank,
    });
    throw error;
  }
}

/**
 * Create a refund for a transaction
 * @param {string} transactionId - Flutterwave transaction ID
 * @param {number} [amount] - Amount to refund in kobo (optional, full refund if not provided)
 * @param {string} [reason] - Reason for refund
 * @returns {Promise<Object>} Refund response
 */
async function createRefund(transactionId, amount, reason = 'Customer request') {
  if (!flutterwave) {
    throw new Error('Flutterwave not configured');
  }

  try {
    const refundData = {
      id: transactionId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason,
    };

    const response = await flutterwave.Transaction.refund(refundData);

    logger.info('Flutterwave refund created', {
      refundId: response.data?.id,
      transactionId,
      amount: refundData.amount,
      status: response.status,
    });

    return response;
  } catch (error) {
    logger.error('Create Flutterwave refund error:', {
      error: error.message,
      transactionId,
      amount,
    });
    throw error;
  }
}

/**
 * Get banks list for transfers
 * @returns {Promise<Array>} List of Nigerian banks
 */
async function getBanks() {
  if (!flutterwave) {
    throw new Error('Flutterwave not configured');
  }

  try {
    const response = await flutterwave.Bank.country({ country: 'NG' });
    return response;
  } catch (error) {
    logger.error('Get banks error:', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Simulate payment for testing (when Flutterwave keys not configured)
 * @param {Object} options - Payment options
 * @returns {Promise<Object>} Simulated payment response
 */
async function simulatePayment({ amount, currency = 'NGN', orderId, buyerId, email }) {
  logger.warn('Simulating Flutterwave payment (Flutterwave not configured)', {
    orderId,
    amount,
    buyerId,
    email,
  });

  return {
    status: 'success',
    message: 'Payment simulated successfully',
    data: {
      id: `simulated_${Date.now()}`,
      tx_ref: `KODO-${orderId}-${Date.now()}`,
      amount: Math.round(amount * 100),
      currency,
      status: 'successful',
      payment_type: 'card',
      customer: { email },
      meta: { orderId, buyerId },
    },
    simulated: true,
  };
}

module.exports = {
  flutterwave,
  createPaymentIntent,
  verifyPayment,
  createTransfer,
  createRefund,
  getBanks,
  simulatePayment,
};