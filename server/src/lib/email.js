const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

/**
 * Initialize email transporter
 */
const initializeTransporter = () => {
  if (transporter) return transporter;

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  // If SMTP credentials not configured, create a test account for development
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    logger.warn('SMTP credentials not configured. Email sending will be simulated.');
    // Return a mock transporter for development
    return {
      sendMail: async (options) => {
        logger.info('Mock email sent:', {
          to: options.to,
          subject: options.subject,
          preview: options.html?.substring(0, 100) || options.text?.substring(0, 100),
        });
        return { messageId: 'mock-' + Date.now() };
      },
    };
  }

  transporter = nodemailer.createTransport(config);

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      logger.error('SMTP connection error:', { error: error.message });
    } else {
      logger.info('SMTP server ready to send emails');
    }
  });

  return transporter;
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const emailTransporter = initializeTransporter();

    const mailOptions = {
      from: `"KODO Platform" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await emailTransporter.sendMail(mailOptions);

    logger.info('Email sent successfully', {
      to,
      subject,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email sending failed:', {
      to,
      subject,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Email templates
 */

const templates = {
  /**
   * Welcome email for new users
   */
  welcome: (username) => ({
    subject: 'Welcome to KODO!',
    text: `Hi ${username},\n\nWelcome to KODO! We're excited to have you on board.\n\nGet started by exploring our marketplace or posting your first request.\n\nBest regards,\nThe KODO Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to KODO!</h2>
        <p>Hi ${username},</p>
        <p>Welcome to KODO! We're excited to have you on board.</p>
        <p>Get started by exploring our marketplace or posting your first request.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Team</p>
      </div>
    `,
  }),

  /**
   * Order confirmation email
   */
  orderConfirmation: (order, product) => ({
    subject: `Order Confirmation - Order #${order.id}`,
    text: `Your order has been confirmed!\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nTotal Amount: $${order.totalAmount}\n\nYou can track your order status in your dashboard.\n\nThank you for using KODO!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Your order has been confirmed!</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>
        <p>You can track your order status in your dashboard.</p>
        <p style="margin-top: 30px;">Thank you for using KODO!</p>
      </div>
    `,
  }),

  /**
   * Payment received email for sellers
   */
  paymentReceived: (order, product) => ({
    subject: `Payment Received - Order #${order.id}`,
    text: `You've received a payment!\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nAmount: $${order.totalAmount}\n\nThe funds are being held in escrow and will be released once the order is completed.\n\nPlease prepare the item for delivery.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment Received!</h2>
        <p>You've received a payment for your product.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Amount:</strong> $${order.totalAmount}</p>
        </div>
        <p>The funds are being held in escrow and will be released once the order is completed.</p>
        <p><strong>Next Steps:</strong> Please prepare the item for delivery.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Team</p>
      </div>
    `,
  }),

  /**
   * Delivery assigned email
   */
  deliveryAssigned: (order, delivery, product) => ({
    subject: `Delivery Assigned - Order #${order.id}`,
    text: `Your order has been assigned to a courier!\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nDelivery Status: ${delivery.status}\n\nYou'll receive updates as your delivery progresses.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Delivery Assigned</h2>
        <p>Your order has been assigned to a courier!</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Delivery Status:</strong> ${delivery.status}</p>
        </div>
        <p>You'll receive updates as your delivery progresses.</p>
        <p style="margin-top: 30px;">Thank you for using KODO!</p>
      </div>
    `,
  }),

  /**
   * Delivery status update email
   */
  deliveryUpdate: (order, delivery, product) => ({
    subject: `Delivery Update - Order #${order.id}`,
    text: `Your delivery status has been updated!\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nDelivery Status: ${delivery.status}\n\nTrack your delivery in real-time from your dashboard.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Delivery Update</h2>
        <p>Your delivery status has been updated!</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Status:</strong> ${delivery.status}</p>
        </div>
        <p>Track your delivery in real-time from your dashboard.</p>
        <p style="margin-top: 30px;">Thank you for using KODO!</p>
      </div>
    `,
  }),

  /**
   * Order completed email
   */
  orderCompleted: (order, product) => ({
    subject: `Order Completed - Order #${order.id}`,
    text: `Your order has been completed!\n\nOrder ID: ${order.id}\nProduct: ${product.title}\n\nThank you for using KODO! We hope you enjoyed your purchase.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Completed!</h2>
        <p>Your order has been successfully completed.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
        </div>
        <p>Thank you for using KODO! We hope you enjoyed your purchase.</p>
        <p>Please consider leaving a review to help other buyers.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Team</p>
      </div>
    `,
  }),

  /**
   * Dispute created email
   */
  disputeCreated: (order, product, disputeReason) => ({
    subject: `Dispute Created - Order #${order.id}`,
    text: `A dispute has been created for your order.\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nReason: ${disputeReason}\n\nOur team will review the dispute and contact you shortly.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Dispute Created</h2>
        <p>A dispute has been created for your order.</p>
        <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Reason:</strong> ${disputeReason}</p>
        </div>
        <p>Our team will review the dispute and contact you shortly.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Support Team</p>
      </div>
    `,
  }),

  /**
   * Dispute resolved email
   */
  disputeResolved: (order, product, resolution) => ({
    subject: `Dispute Resolved - Order #${order.id}`,
    text: `Your dispute has been resolved.\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nResolution: ${resolution}\n\nThank you for your patience.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Dispute Resolved</h2>
        <p>Your dispute has been resolved.</p>
        <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Resolution:</strong> ${resolution}</p>
        </div>
        <p>Thank you for your patience.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Support Team</p>
      </div>
    `,
  }),

  /**
   * New offer received email for buyers
   */
  newOffer: (bid, offer, product) => ({
    subject: `New Offer Received - ${product?.title || 'Your Request'}`,
    text: `You've received a new offer!\n\n${product ? `Product: ${product.title}\n` : ''}Offer Amount: $${offer.amount}\n\nReview and accept the offer in your dashboard.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Offer Received!</h2>
        <p>You've received a new offer for your request.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          ${product ? `<p><strong>Product:</strong> ${product.title}</p>` : ''}
          <p><strong>Offer Amount:</strong> $${offer.amount}</p>
          <p><strong>Request ID:</strong> ${bid.id}</p>
        </div>
        <p>Review and accept the offer in your dashboard.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Team</p>
      </div>
    `,
  }),

  /**
   * Offer accepted email for sellers
   */
  offerAccepted: (bid, product) => ({
    subject: `Offer Accepted - ${product?.title || 'Your Offer'}`,
    text: `Your offer has been accepted!\n\n${product ? `Product: ${product.title}\n` : ''}Request ID: ${bid.id}\n\nThe buyer will proceed with payment shortly.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Offer Accepted!</h2>
        <p>Your offer has been accepted by the buyer.</p>
        <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          ${product ? `<p><strong>Product:</strong> ${product.title}</p>` : ''}
          <p><strong>Request ID:</strong> ${bid.id}</p>
        </div>
        <p>The buyer will proceed with payment shortly.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Team</p>
      </div>
    `,
  }),

  /**
   * Refund requested email for sellers
   */
  refundRequested: (refund, order, product) => ({
    subject: `Refund Request - Order #${order.id}`,
    text: `A refund has been requested for your order.\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nRefund Amount: $${refund.amount}\nReason: ${refund.reason}\n\nPlease review the request in your dashboard.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Refund Request</h2>
        <p>A refund has been requested for your order.</p>
        <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Refund Amount:</strong> $${refund.amount}</p>
          <p><strong>Reason:</strong> ${refund.reason}</p>
        </div>
        <p>Please review the request in your dashboard.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Support Team</p>
      </div>
    `,
  }),

  /**
   * Refund approved email
   */
  refundApproved: (refund, order, product) => ({
    subject: `Refund Approved - Order #${order.id}`,
    text: `Your refund request has been approved!\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nRefund Amount: $${refund.amount}\n\nThe refund will be processed to your original payment method within 5-7 business days.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Refund Approved</h2>
        <p>Your refund request has been approved!</p>
        <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Refund Amount:</strong> $${refund.amount}</p>
        </div>
        <p>The refund will be processed to your original payment method within 5-7 business days.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Support Team</p>
      </div>
    `,
  }),

  /**
   * Refund rejected email
   */
  refundRejected: (refund, order, product, notes) => ({
    subject: `Refund Request Update - Order #${order.id}`,
    text: `Your refund request has been reviewed.\n\nOrder ID: ${order.id}\nProduct: ${product.title}\nStatus: Rejected\n${notes ? `Notes: ${notes}\n` : ''}\nIf you have questions, please contact our support team.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Refund Request Update</h2>
        <p>Your refund request has been reviewed.</p>
        <div style="background: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Product:</strong> ${product.title}</p>
          <p><strong>Status:</strong> Rejected</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>
        <p>If you have questions about this decision, please contact our support team.</p>
        <p style="margin-top: 30px;">Best regards,<br/>The KODO Support Team</p>
      </div>
    `,
  }),
};

module.exports = {
  sendEmail,
  templates,
  initializeTransporter,
};
