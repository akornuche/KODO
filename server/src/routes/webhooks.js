const express = require('express');
const { constructWebhookEvent } = require('../lib/stripe');
const { handleFlutterwaveWebhook } = require('../controllers/webhookController');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { broadcastOrderUpdate } = require('../lib/socket');

const router = express.Router();

/**
 * Stripe webhook endpoint
 * POST /api/webhooks/stripe
 * 
 * This endpoint receives events from Stripe and processes them
 * Important: This route must use raw body parsing (not JSON)
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    try {
      // Construct and verify webhook event
      const event = constructWebhookEvent(req.body, signature);

      logger.info('Stripe webhook received', {
        eventId: event.id,
        type: event.type,
      });

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;

        case 'transfer.created':
          await handleTransferCreated(event.data.object);
          break;

        case 'transfer.failed':
          await handleTransferFailed(event.data.object);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      // Acknowledge receipt of event
      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook error:', { error: error.message });
      return res.status(400).json({
        error: true,
        message: 'Webhook signature verification failed',
      });
    }
  }
);

/**
 * Flutterwave webhook endpoint
 * POST /api/webhooks/flutterwave
 * 
 * This endpoint receives events from Flutterwave and processes them
 */
router.post(
  '/flutterwave',
  express.json(),
  handleFlutterwaveWebhook
);

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(paymentIntent) {
  try {
    const { orderId } = paymentIntent.metadata;

    if (!orderId) {
      logger.warn('Payment intent missing orderId in metadata', {
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    // Find order and update if not already paid
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        escrow: true,
        buyer: true,
        product: {
          include: { seller: true },
        },
      },
    });

    if (!order) {
      logger.error('Order not found for payment intent', {
        paymentIntentId: paymentIntent.id,
        orderId,
      });
      return;
    }

    if (order.status === 'paid' && order.escrow) {
      logger.info('Order already marked as paid', { orderId });
      return;
    }

    // Create escrow if doesn't exist
    let escrow = order.escrow;
    if (!escrow) {
      escrow = await prisma.escrow.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          released: false,
          paymentIntentId: paymentIntent.id,
        },
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        escrowId: escrow.id,
      },
      include: {
        buyer: true,
        product: {
          include: { seller: true },
        },
        escrow: true,
      },
    });

    logger.info('Order marked as paid via webhook', {
      orderId,
      paymentIntentId: paymentIntent.id,
      escrowId: escrow.id,
    });

    // Broadcast update
    broadcastOrderUpdate(updatedOrder);
  } catch (error) {
    logger.error('Handle payment succeeded error:', {
      error: error.message,
      paymentIntentId: paymentIntent.id,
    });
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent) {
  try {
    const { orderId } = paymentIntent.metadata;

    if (!orderId) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return;

    logger.error('Payment failed for order', {
      orderId,
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
    });

    // Optionally update order status to 'cancelled' or keep as 'pending'
    // depending on business logic
  } catch (error) {
    logger.error('Handle payment failed error:', {
      error: error.message,
      paymentIntentId: paymentIntent.id,
    });
  }
}

/**
 * Handle transfer created (funds sent to seller)
 */
async function handleTransferCreated(transfer) {
  try {
    const { orderId, sellerId } = transfer.metadata;

    logger.info('Transfer created to seller', {
      transferId: transfer.id,
      orderId,
      sellerId,
      amount: transfer.amount,
    });
  } catch (error) {
    logger.error('Handle transfer created error:', {
      error: error.message,
      transferId: transfer.id,
    });
  }
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(transfer) {
  try {
    const { orderId, sellerId } = transfer.metadata;

    logger.error('Transfer to seller failed', {
      transferId: transfer.id,
      orderId,
      sellerId,
      error: transfer.failure_message,
    });

    // Alert admin about failed transfer via notification system
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@kodo.com',
        subject: 'Transfer Failed - Requires Attention',
        html: `<p>Transfer failed for order ${orderId}</p>
               <p>Seller ID: ${sellerId}</p>
               <p>Error: ${transfer.failure_message}</p>
               <p>Please review and take appropriate action.</p>`,
      });
    } catch (emailError) {
      logger.error('Failed to send admin alert:', { error: emailError.message });
    }
  } catch (error) {
    logger.error('Handle transfer failed error:', {
      error: error.message,
      transferId: transfer.id,
    });
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge) {
  try {
    const paymentIntentId = charge.payment_intent;

    // Find escrow by payment intent ID
    const escrow = await prisma.escrow.findFirst({
      where: { paymentIntentId },
      include: { order: true },
    });

    if (!escrow) {
      logger.warn('Escrow not found for refunded charge', {
        chargeId: charge.id,
        paymentIntentId,
      });
      return;
    }

    logger.info('Charge refunded', {
      chargeId: charge.id,
      orderId: escrow.orderId,
      amount: charge.amount_refunded,
    });

    // Update order status to cancelled
    const updatedOrder = await prisma.order.update({
      where: { id: escrow.orderId },
      data: { status: 'cancelled' },
      include: {
        buyer: true,
        product: {
          include: { seller: true },
        },
        escrow: true,
      },
    });

    broadcastOrderUpdate(updatedOrder);
  } catch (error) {
    logger.error('Handle charge refunded error:', {
      error: error.message,
      chargeId: charge.id,
    });
  }
}

module.exports = router;
