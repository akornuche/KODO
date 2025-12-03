const Stripe = require('stripe');
const logger = require('./logger');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use latest stable version
});

/**
 * Create a payment intent for an order
 * @param {Object} options - Payment options
 * @param {number} options.amount - Amount in cents (e.g., 4599 for $45.99)
 * @param {string} options.currency - Currency code (e.g., 'ngn')
 * @param {string} options.orderId - Order ID for metadata
 * @param {string} options.buyerId - Buyer user ID
 * @param {string} [options.paymentMethodId] - Payment method ID (optional)
 * @returns {Promise<Object>} Payment intent object
 */
async function createPaymentIntent({ amount, currency = 'ngn', orderId, buyerId, paymentMethodId }) {
  try {
    const paymentIntentData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        orderId,
        buyerId,
        platform: 'KODO',
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    };

    // If payment method provided, attach and confirm immediately
    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
      paymentIntentData.confirm = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      orderId,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Create payment intent error:', {
      error: error.message,
      orderId,
      amount,
    });
    throw error;
  }
}

/**
 * Confirm a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @param {string} [paymentMethodId] - Payment method ID (if not already attached)
 * @returns {Promise<Object>} Confirmed payment intent
 */
async function confirmPaymentIntent(paymentIntentId, paymentMethodId) {
  try {
    const confirmData = {};
    
    if (paymentMethodId) {
      confirmData.payment_method = paymentMethodId;
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, confirmData);

    logger.info('Payment intent confirmed', {
      paymentIntentId,
      status: paymentIntent.status,
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Confirm payment intent error:', {
      error: error.message,
      paymentIntentId,
    });
    throw error;
  }
}

/**
 * Retrieve a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} Payment intent object
 */
async function getPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error('Get payment intent error:', {
      error: error.message,
      paymentIntentId,
    });
    throw error;
  }
}

/**
 * Create a transfer to seller (release escrow funds)
 * @param {Object} options - Transfer options
 * @param {number} options.amount - Amount in cents
 * @param {string} options.currency - Currency code
 * @param {string} options.destination - Stripe connected account ID (seller)
 * @param {string} options.orderId - Order ID for metadata
 * @param {string} options.sellerId - Seller user ID
 * @returns {Promise<Object>} Transfer object
 */
async function createTransfer({ amount, currency = 'ngn', destination, orderId, sellerId }) {
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency,
      destination, // Seller's Stripe connected account ID
      metadata: {
        orderId,
        sellerId,
        platform: 'KODO',
      },
    });

    logger.info('Transfer created', {
      transferId: transfer.id,
      orderId,
      amount: transfer.amount,
      destination,
    });

    return transfer;
  } catch (error) {
    logger.error('Create transfer error:', {
      error: error.message,
      orderId,
      amount,
      destination,
    });
    throw error;
  }
}

/**
 * Create a refund for a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @param {number} [amount] - Amount to refund in cents (optional, full refund if not provided)
 * @param {string} [reason] - Reason for refund
 * @returns {Promise<Object>} Refund object
 */
async function createRefund(paymentIntentId, amount, reason = 'requested_by_customer') {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
      reason,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundData);

    logger.info('Refund created', {
      refundId: refund.id,
      paymentIntentId,
      amount: refund.amount,
      status: refund.status,
    });

    return refund;
  } catch (error) {
    logger.error('Create refund error:', {
      error: error.message,
      paymentIntentId,
      amount,
    });
    throw error;
  }
}

/**
 * Construct webhook event from raw body and signature
 * @param {Buffer} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} Stripe event object
 */
function constructWebhookEvent(payload, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    logger.info('Webhook event constructed', {
      eventId: event.id,
      type: event.type,
    });

    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed:', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Simulate payment for testing (when Stripe keys not configured)
 * @param {Object} options - Payment options
 * @returns {Promise<Object>} Simulated payment intent
 */
async function simulatePayment({ amount, currency = 'ngn', orderId, buyerId }) {
  logger.warn('Simulating payment (Stripe not configured)', {
    orderId,
    amount,
    buyerId,
  });

  return {
    id: `pi_simulated_${Date.now()}`,
    status: 'succeeded',
    amount: Math.round(amount * 100),
    currency,
    metadata: { orderId, buyerId },
    simulated: true,
  };
}

module.exports = {
  stripe,
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentIntent,
  createTransfer,
  createRefund,
  constructWebhookEvent,
  simulatePayment,
};
