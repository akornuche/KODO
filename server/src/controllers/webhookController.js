const crypto = require('crypto');
const logger = require('../lib/logger');
const prisma = require('../lib/prisma');
const { verifyPayment } = require('../lib/flutterwave');
const { broadcastOrderUpdate } = require('../lib/socket');

/**
 * Verify Flutterwave webhook signature
 * @param {string} signature - Webhook signature from headers
 * @param {Buffer} payload - Raw request body
 * @returns {boolean} Whether signature is valid
 */
function verifyWebhookSignature(signature, payload) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_KEY)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    logger.error('Webhook signature verification error:', { error: error.message });
    return false;
  }
}

/**
 * Handle Flutterwave payment webhook
 * POST /api/webhooks/flutterwave
 */
exports.handleFlutterwaveWebhook = async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(signature, payload)) {
      logger.warn('Invalid Flutterwave webhook signature', {
        signature: signature ? 'present' : 'missing',
        requestId: req.id,
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    logger.info('Flutterwave webhook received', {
      requestId: req.id,
      event: event.event,
      tx_ref: event.data?.tx_ref,
      status: event.data?.status,
    });

    // Handle different webhook events
    switch (event.event) {
      case 'charge.completed':
        await handleChargeCompleted(event.data);
        break;

      case 'transfer.completed':
        await handleTransferCompleted(event.data);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;

      default:
        logger.info('Unhandled Flutterwave webhook event', {
          requestId: req.id,
          event: event.event,
        });
    }

    res.json({ status: 'success' });
  } catch (error) {
    logger.error('Flutterwave webhook error:', {
      requestId: req.id,
      error: error.message,
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle successful charge completion
 * @param {Object} data - Webhook data
 */
async function handleChargeCompleted(data) {
  try {
    const { tx_ref, id: transactionId, status, amount, currency } = data;

    // Extract order ID from tx_ref (format: KODO-{orderId}-{timestamp})
    const orderIdMatch = tx_ref.match(/KODO-([^-]+)-/);
    if (!orderIdMatch) {
      logger.warn('Invalid tx_ref format', { tx_ref });
      return;
    }

    const orderId = orderIdMatch[1];

    // Find escrow by Flutterwave tx_ref
    const escrow = await prisma.escrow.findFirst({
      where: {
        flutterwaveTxRef: tx_ref,
      },
      include: {
        order: {
          include: {
            buyer: true,
            product: {
              include: { seller: true },
            },
          },
        },
      },
    });

    if (!escrow) {
      logger.warn('Escrow not found for Flutterwave tx_ref', { tx_ref, orderId });
      return;
    }

    if (status === 'successful') {
      // Update escrow with transaction ID
      await prisma.escrow.update({
        where: { id: escrow.id },
        data: {
          flutterwaveTxId: transactionId.toString(),
        },
      });

      // Update order status to paid
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          escrow: true,
        },
      });

      logger.info('Order marked as paid via Flutterwave webhook', {
        orderId,
        escrowId: escrow.id,
        transactionId,
        amount,
      });

      // Create delivery for this order
      const { createDeliveryForOrder } = require('./deliveryController');
      try {
        const pickupAddress = updatedOrder.product?.description || 'Seller location';
        const deliveryAddress = updatedOrder.buyer?.email || 'Buyer location';

        await createDeliveryForOrder(orderId, pickupAddress, deliveryAddress);

        logger.info('Delivery created for paid order via webhook', {
          orderId,
        });
      } catch (deliveryError) {
        logger.error('Failed to create delivery via webhook:', {
          orderId,
          error: deliveryError.message,
        });
      }

      // Broadcast order update
      broadcastOrderUpdate(updatedOrder);

      // Send notifications (async)
      const { sendOrderConfirmation, sendPaymentReceivedNotification } = require('./notificationsController');
      sendOrderConfirmation(updatedOrder);
      sendPaymentReceivedNotification(updatedOrder);

    } else if (status === 'failed') {
      logger.warn('Flutterwave payment failed', {
        orderId,
        transactionId,
        amount,
      });

      // Could update order status or send notification
    }
  } catch (error) {
    logger.error('Handle charge completed error:', {
      error: error.message,
      tx_ref: data.tx_ref,
    });
  }
}

/**
 * Handle successful transfer completion
 * @param {Object} data - Webhook data
 */
async function handleTransferCompleted(data) {
  try {
    const { reference, status, amount } = data;

    logger.info('Transfer completed via webhook', {
      reference,
      status,
      amount,
    });

    // Handle transfer completion (for escrow releases)
    // This would be used when we implement seller payouts
  } catch (error) {
    logger.error('Handle transfer completed error:', {
      error: error.message,
      reference: data.reference,
    });
  }
}

/**
 * Handle failed transfer
 * @param {Object} data - Webhook data
 */
async function handleTransferFailed(data) {
  try {
    const { reference, status, amount } = data;

    logger.error('Transfer failed via webhook', {
      reference,
      status,
      amount,
    });

    // Handle transfer failure (for escrow releases)
    // This would be used when we implement seller payouts
  } catch (error) {
    logger.error('Handle transfer failed error:', {
      error: error.message,
      reference: data.reference,
    });
  }
}

module.exports = exports;