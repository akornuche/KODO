const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { sendEmail, templates } = require('../lib/email');
const { sendPushNotification, NOTIFICATION_TYPES, registerDeviceToken, registerPushSubscription, getUnreadNotifications, markNotificationsAsRead } = require('../lib/pushNotifications');

/**
 * Notification preferences model (stored in user table for now)
 * In future, could be expanded to separate table with granular preferences
 */

/**
 * Send welcome email to new user
 * @param {Object} user - User object
 */
exports.sendWelcomeEmail = async (user) => {
  try {
    const emailContent = templates.welcome(user.username);

    await sendEmail({
      to: user.email,
      ...emailContent,
    });

    logger.info('Welcome email sent', {
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    logger.error('Failed to send welcome email:', {
      userId: user.id,
      error: error.message,
    });
  }
};

/**
 * Send order confirmation email
 * @param {Object} order - Order object with buyer and product
 */
exports.sendOrderConfirmation = async (order) => {
  try {
    const emailContent = templates.orderConfirmation(order, order.product);

    await sendEmail({
      to: order.buyer.email,
      ...emailContent,
    });

    // Send push notification
    await sendPushNotification(
      order.buyer.id,
      NOTIFICATION_TYPES.ORDER_PLACED,
      'Order Confirmed',
      `Your order for ${order.product.title} has been confirmed`,
      {
        orderId: order.id,
        productId: order.product.id,
        amount: order.totalAmount,
      }
    );

    // Send SMS for critical order notifications (fallback)
    try {
      if (order.buyer.phoneNumber) {
        await smsService.sendSMS(
          order.buyer.phoneNumber,
          `KODO: Your order for ${order.product.title} has been confirmed. Order #${order.id.slice(-8).toUpperCase()}`
        );
      }
    } catch (smsError) {
      logger.warn('SMS notification failed for order confirmation', {
        orderId: order.id,
        buyerId: order.buyer.id,
        error: smsError.message,
      });
    }

    logger.info('Order confirmation email and push notification sent', {
      orderId: order.id,
      buyerId: order.buyer.id,
      buyerEmail: order.buyer.email,
    });
  } catch (error) {
    logger.error('Failed to send order confirmation email:', {
      orderId: order.id,
      error: error.message,
    });
  }
};

/**
 * Send payment received notification to seller
 * @param {Object} order - Order object with seller info
 */
exports.sendPaymentReceivedNotification = async (order) => {
  try {
    const emailContent = templates.paymentReceived(order, order.product);

    await sendEmail({
      to: order.product.seller.email,
      ...emailContent,
    });

    // Send push notification to seller
    await sendPushNotification(
      order.product.seller.id,
      NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      'Payment Received',
      `Payment received for ${order.product.title}`,
      {
        orderId: order.id,
        productId: order.product.id,
        amount: order.totalAmount,
        buyerId: order.buyer.id,
      }
    );

    logger.info('Payment received email and push notification sent', {
      orderId: order.id,
      sellerId: order.product.seller.id,
      sellerEmail: order.product.seller.email,
    });
  } catch (error) {
    logger.error('Failed to send payment received email:', {
      orderId: order.id,
      error: error.message,
    });
  }
};

/**
 * Send delivery assigned notification
 * @param {Object} order - Order object
 * @param {Object} delivery - Delivery object
 */
exports.sendDeliveryAssignedNotification = async (order, delivery) => {
  try {
    const emailContent = templates.deliveryAssigned(order, delivery, order.product);

    await sendEmail({
      to: order.buyer.email,
      ...emailContent,
    });

    // Send push notification to buyer
    await sendPushNotification(
      order.buyer.id,
      NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
      'Delivery Assigned',
      `Your order for ${order.product.title} has been assigned for delivery`,
      {
        orderId: order.id,
        deliveryId: delivery.id,
        productId: order.product.id,
        deliveryAgent: delivery.agentName,
      }
    );

    logger.info('Delivery assigned email and push notification sent', {
      orderId: order.id,
      deliveryId: delivery.id,
      buyerId: order.buyer.id,
      buyerEmail: order.buyer.email,
    });
  } catch (error) {
    logger.error('Failed to send delivery assigned email:', {
      orderId: order.id,
      deliveryId: delivery.id,
      error: error.message,
    });
  }
};

exports.sendDeliveryUpdateNotification = async (order, delivery) => {
  try {
    if (!order || !order.buyer || !order.product || !order.product.seller) {
      logger.warn('Incomplete order data for delivery update notification', {
        orderId: order?.id,
        deliveryId: delivery?.id,
      });
      return;
    }

    const emailContent = templates.deliveryUpdate(order, delivery, order.product);

    await sendEmail({
      to: order.buyer.email,
      ...emailContent,
    });

    // Send push notification to buyer
    let notificationType, title, body;
    switch (delivery.status) {
      case 'picked_up':
        notificationType = NOTIFICATION_TYPES.DELIVERY_PICKED_UP;
        title = 'Package Picked Up';
        body = `Your order for ${order.product.title} has been picked up`;
        break;
      case 'in_transit':
        notificationType = NOTIFICATION_TYPES.DELIVERY_IN_TRANSIT;
        title = 'Package In Transit';
        body = `Your order for ${order.product.title} is on the way`;
        break;
      case 'out_for_delivery':
        notificationType = NOTIFICATION_TYPES.DELIVERY_OUT_FOR_DELIVERY;
        title = 'Out for Delivery';
        body = `Your order for ${order.product.title} is out for delivery`;
        break;
      case 'delivered':
        notificationType = NOTIFICATION_TYPES.DELIVERY_DELIVERED;
        title = 'Package Delivered';
        body = `Your order for ${order.product.title} has been delivered`;
        break;
      default:
        notificationType = NOTIFICATION_TYPES.DELIVERY_IN_TRANSIT;
        title = 'Delivery Update';
        body = `Update on your order for ${order.product.title}`;
    }

    await sendPushNotification(
      order.buyer.id,
      notificationType,
      title,
      body,
      {
        orderId: order.id,
        deliveryId: delivery.id,
        productId: order.product.id,
        status: delivery.status,
        location: delivery.currentLocation,
      }
    );

    // Send SMS for critical delivery updates
    if (notificationType === NOTIFICATION_TYPES.DELIVERY_DELIVERED ||
        notificationType === NOTIFICATION_TYPES.DELIVERY_FAILED) {
      try {
        if (order.buyer.phoneNumber) {
          await smsService.sendSMS(
            order.buyer.phoneNumber,
            `KODO: ${body} - Order #${order.id.slice(-8).toUpperCase()}`
          );
        }
      } catch (smsError) {
        logger.warn('SMS notification failed for delivery update', {
          orderId: order.id,
          deliveryId: delivery.id,
          status: delivery.status,
          error: smsError.message,
        });
      }
    }

    logger.info('Delivery update email and push notification sent', {
      orderId: order.id,
      deliveryId: delivery.id,
      status: delivery.status,
      buyerId: order.buyer.id,
      buyerEmail: order.buyer.email,
    });
  } catch (error) {
    logger.error('Failed to send delivery update email:', {
      orderId: order?.id,
      deliveryId: delivery?.id,
      error: error.message,
    });
  }
};

exports.sendOrderCompletedNotification = async (order) => {
  try {
    if (!order || !order.buyer || !order.product) {
      logger.warn('Incomplete order data for order completed notification', {
        orderId: order?.id,
      });
      return;
    }

    const emailContent = templates.orderCompleted(order, order.product);

    await sendEmail({
      to: order.buyer.email,
      ...emailContent,
    });

    logger.info('Order completed email sent', {
      orderId: order.id,
      buyerId: order.buyer.id,
      buyerEmail: order.buyer.email,
    });
  } catch (error) {
    logger.error('Failed to send order completed email:', {
      orderId: order?.id,
      error: error.message,
    });
  }
};

exports.sendDisputeCreatedNotification = async (order, disputeReason) => {
  try {
    if (!order || !order.buyer || !order.product || !order.product.seller) {
      logger.warn('Incomplete order data for dispute created notification', {
        orderId: order?.id,
      });
      return;
    }

    const emailContent = templates.disputeCreated(order, order.product, disputeReason);

    // Send to both buyer and seller
    const emails = [
      { to: order.buyer.email, userType: 'buyer' },
      { to: order.product.seller.email, userType: 'seller' },
    ];

    for (const email of emails) {
      await sendEmail({
        ...email,
        ...emailContent,
      });

      logger.info('Dispute created email sent', {
        orderId: order.id,
        userType: email.userType,
        email: email.to,
      });
    }
  } catch (error) {
    logger.error('Failed to send dispute created email:', {
      orderId: order?.id,
      error: error.message,
    });
  }
};

/**
 * Send new offer notification to buyer
 * @param {Object} bid - Bid object
 * @param {Object} offer - Offer object
 */
exports.sendNewOfferNotification = async (bid, offer) => {
  try {
    const emailContent = templates.newOffer(bid, offer, bid.product);

    await sendEmail({
      to: bid.buyer.email,
      ...emailContent,
    });

    // Send push notification to buyer
    await sendPushNotification(
      bid.buyer.id,
      NOTIFICATION_TYPES.NEW_BID,
      'New Bid Received',
      `You received a new bid for ${bid.product.title}`,
      {
        bidId: bid.id,
        offerId: offer.id,
        productId: bid.product.id,
        amount: offer.amount,
        sellerId: bid.product.seller.id,
      }
    );

    // Send SMS for bid notifications (important for marketplace activity)
    try {
      if (bid.buyer.phoneNumber) {
        await smsService.sendSMS(
          bid.buyer.phoneNumber,
          `KODO: New bid received for ${bid.product.title} - ₦${offer.amount.toLocaleString()}`
        );
      }
    } catch (smsError) {
      logger.warn('SMS notification failed for new bid', {
        bidId: bid.id,
        offerId: offer.id,
        buyerId: bid.buyer.id,
        error: smsError.message,
      });
    }

    logger.info('New offer email and push notification sent', {
      bidId: bid.id,
      offerId: offer.id,
      buyerId: bid.buyer.id,
      buyerEmail: bid.buyer.email,
    });
  } catch (error) {
    logger.error('Failed to send new offer email:', {
      bidId: bid.id,
      offerId: offer.id,
      error: error.message,
    });
  }
};

/**
 * Send offer accepted notification to seller
 * @param {Object} bid - Bid object
 */
exports.sendOfferAcceptedNotification = async (bid) => {
  try {
    const emailContent = templates.offerAccepted(bid, bid.product);

    await sendEmail({
      to: bid.seller.email,
      ...emailContent,
    });

    // Send push notification to seller
    await sendPushNotification(
      bid.seller.id,
      NOTIFICATION_TYPES.BID_ACCEPTED,
      'Bid Accepted',
      `Your bid for ${bid.product.title} has been accepted`,
      {
        bidId: bid.id,
        productId: bid.product.id,
        amount: bid.acceptedOffer?.amount,
        buyerId: bid.buyer.id,
      }
    );

    logger.info('Offer accepted email and push notification sent', {
      bidId: bid.id,
      sellerId: bid.seller.id,
      sellerEmail: bid.seller.email,
    });
  } catch (error) {
    logger.error('Failed to send offer accepted email:', {
      bidId: bid.id,
      error: error.message,
    });
  }
};

exports.sendRefundRequestedNotification = async (refund, order) => {
  try {
    if (!refund || !order || !order.product || !order.product.seller) {
      logger.warn('Incomplete data for refund requested notification', {
        refundId: refund?.id,
        orderId: order?.id,
      });
      return;
    }

    const emailContent = templates.refundRequested(refund, order, order.product);

    await sendEmail({
      to: order.product.seller.email,
      ...emailContent,
    });

    logger.info('Refund requested email sent', {
      refundId: refund.id,
      orderId: order.id,
      sellerId: order.product.seller.id,
      sellerEmail: order.product.seller.email,
    });
  } catch (error) {
    logger.error('Failed to send refund requested email:', {
      refundId: refund?.id,
      orderId: order?.id,
      error: error.message,
    });
  }
};

exports.sendRefundApprovedNotification = async (refund, order) => {
  try {
    if (!refund || !order || !order.buyer || !order.product) {
      logger.warn('Incomplete data for refund approved notification', {
        refundId: refund?.id,
        orderId: order?.id,
      });
      return;
    }

    const emailContent = templates.refundApproved(refund, order, order.product);

    await sendEmail({
      to: order.buyer.email,
      ...emailContent,
    });

    logger.info('Refund approved email sent', {
      refundId: refund.id,
      orderId: order.id,
      buyerId: order.buyer.id,
      buyerEmail: order.buyer.email,
    });
  } catch (error) {
    logger.error('Failed to send refund approved email:', {
      refundId: refund?.id,
      orderId: order?.id,
      error: error.message,
    });
  }
};

exports.sendRefundRejectedNotification = async (refund, order, notes) => {
  try {
    if (!refund || !order || !order.buyer || !order.product) {
      logger.warn('Incomplete data for refund rejected notification', {
        refundId: refund?.id,
        orderId: order?.id,
      });
      return;
    }

    const emailContent = templates.refundRejected(refund, order, order.product, notes);

    await sendEmail({
      to: order.buyer.email,
      ...emailContent,
    });

    logger.info('Refund rejected email sent', {
      refundId: refund.id,
      orderId: order.id,
      buyerId: order.buyer.id,
      buyerEmail: order.buyer.email,
    });
  } catch (error) {
    logger.error('Failed to send refund rejected email:', {
      refundId: refund?.id,
      orderId: order?.id,
      error: error.message,
    });
  }
};

/**
 * Get user notification preferences
 * GET /api/notifications/preferences
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notificationPreferences: true },
    });

    const preferences = user?.notificationPreferences || {
      email: {
        orderUpdates: true,
        paymentNotifications: true,
        deliveryUpdates: true,
        bidNotifications: true,
        refundNotifications: true,
        disputeNotifications: true,
        marketingEmails: false,
      },
      push: {
        orderUpdates: true,
        deliveryUpdates: true,
        bidNotifications: true,
      },
    };

    logger.info('Retrieved notification preferences', {
      requestId: req.id,
      userId: req.user.id,
    });

    res.json({ preferences });
  } catch (error) {
    logger.error('Get notification preferences error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve notification preferences',
      code: 'GET_PREFERENCES_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update user notification preferences
 * PUT /api/notifications/preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { email, push } = req.body;

    // Validate preferences structure
    const validPreferences = {
      email: {
        orderUpdates: typeof email?.orderUpdates === 'boolean' ? email.orderUpdates : true,
        paymentNotifications: typeof email?.paymentNotifications === 'boolean' ? email.paymentNotifications : true,
        deliveryUpdates: typeof email?.deliveryUpdates === 'boolean' ? email.deliveryUpdates : true,
        bidNotifications: typeof email?.bidNotifications === 'boolean' ? email.bidNotifications : true,
        refundNotifications: typeof email?.refundNotifications === 'boolean' ? email.refundNotifications : true,
        disputeNotifications: typeof email?.disputeNotifications === 'boolean' ? email.disputeNotifications : true,
        marketingEmails: typeof email?.marketingEmails === 'boolean' ? email.marketingEmails : false,
      },
      push: {
        orderUpdates: typeof push?.orderUpdates === 'boolean' ? push.orderUpdates : true,
        deliveryUpdates: typeof push?.deliveryUpdates === 'boolean' ? push.deliveryUpdates : true,
        bidNotifications: typeof push?.bidNotifications === 'boolean' ? push.bidNotifications : true,
      },
    };

    // Save preferences to database
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        notificationPreferences: validPreferences,
      },
    });

    logger.info('Updated notification preferences', {
      requestId: req.id,
      userId: req.user.id,
      preferences: validPreferences,
    });

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: validPreferences,
    });
  } catch (error) {
    logger.error('Update notification preferences error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update notification preferences',
      code: 'UPDATE_PREFERENCES_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Send test notification
 * POST /api/notifications/test
 */
exports.sendTestNotification = async (req, res) => {
  try {
    const emailContent = {
      subject: 'Test Notification - KODO',
      text: 'This is a test notification from KODO. If you received this, your email notifications are working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Notification</h2>
          <p>This is a test notification from KODO.</p>
          <p>If you received this, your email notifications are working correctly.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The KODO Team</p>
        </div>
      `,
    };

    await sendEmail({
      to: req.user.email,
      ...emailContent,
    });

    // Send test push notification
    await sendPushNotification(
      req.user.id,
      NOTIFICATION_TYPES.ACCOUNT_VERIFIED,
      'Test Notification',
      'This is a test push notification from KODO',
      { test: true }
    );

    logger.info('Test notification sent', {
      requestId: req.id,
      userId: req.user.id,
      email: req.user.email,
    });

    res.json({
      message: 'Test notification sent successfully',
    });
  } catch (error) {
    logger.error('Send test notification error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to send test notification',
      code: 'SEND_TEST_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Register device token for push notifications
 * POST /api/notifications/device-token
 */
exports.registerDeviceToken = async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({
        error: true,
        message: 'Device token is required',
        code: 'MISSING_TOKEN',
        requestId: req.id,
      });
    }

    await registerDeviceToken(req.user.id, token, platform);

    logger.info('Device token registered', {
      requestId: req.id,
      userId: req.user.id,
      platform,
    });

    res.json({
      message: 'Device token registered successfully',
    });
  } catch (error) {
    logger.error('Register device token error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to register device token',
      code: 'REGISTER_TOKEN_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Register web push subscription
 * POST /api/notifications/push-subscription
 */
exports.registerPushSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        error: true,
        message: 'Valid push subscription is required',
        code: 'INVALID_SUBSCRIPTION',
        requestId: req.id,
      });
    }

    await registerPushSubscription(req.user.id, subscription);

    logger.info('Push subscription registered', {
      requestId: req.id,
      userId: req.user.id,
      endpoint: subscription.endpoint,
    });

    res.json({
      message: 'Push subscription registered successfully',
    });
  } catch (error) {
    logger.error('Register push subscription error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to register push subscription',
      code: 'REGISTER_SUBSCRIPTION_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get unread notifications
 * GET /api/notifications/unread
 */
exports.getUnreadNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await getUnreadNotifications(req.user.id, limit);

    logger.info('Retrieved unread notifications', {
      requestId: req.id,
      userId: req.user.id,
      count: notifications.length,
    });

    res.json({
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    logger.error('Get unread notifications error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve unread notifications',
      code: 'GET_UNREAD_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Mark notifications as read
 * PUT /api/notifications/mark-read
 */
exports.markNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Notification IDs array is required',
        code: 'MISSING_IDS',
        requestId: req.id,
      });
    }

    await markNotificationsAsRead(req.user.id, notificationIds);

    logger.info('Notifications marked as read', {
      requestId: req.id,
      userId: req.user.id,
      count: notificationIds.length,
    });

    res.json({
      message: 'Notifications marked as read successfully',
    });
  } catch (error) {
    logger.error('Mark notifications as read error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to mark notifications as read',
      code: 'MARK_READ_ERROR',
      requestId: req.id,
    });
  }
};

module.exports = exports;