# Email Notification System Guide

This guide explains the email notification system integrated into the KODO platform.

## Overview

The email system uses **nodemailer** for SMTP email delivery and includes professionally designed HTML email templates for all major platform events.

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM=noreply@kodo.com
```

### Gmail Setup (Recommended for Development)

1. **Create a Gmail Account** or use existing one
2. **Enable 2-Factor Authentication** (required for app passwords)
3. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail" application
   - Copy the 16-character password
4. **Update `.env` file**:
   ```bash
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   ```

### Other SMTP Providers

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key-id
SMTP_PASSWORD=your-aws-secret-access-key
```

## Email Templates

The system includes 10 pre-built email templates:

### 1. Welcome Email
**Trigger:** User registration  
**Recipient:** New user  
**Template:** `templates.welcome(username)`  
**Content:** Welcome message and getting started guidance

### 2. Order Confirmation
**Trigger:** Buyer pays for order  
**Recipient:** Buyer  
**Template:** `templates.orderConfirmation(order, product)`  
**Content:** Order details, product info, tracking instructions

### 3. Payment Received
**Trigger:** Buyer pays for order  
**Recipient:** Seller  
**Template:** `templates.paymentReceived(order, product)`  
**Content:** Payment notification, escrow info, next steps

### 4. Delivery Assigned
**Trigger:** Courier accepts delivery  
**Recipient:** Buyer & Seller  
**Template:** `templates.deliveryAssigned(order, delivery, product)`  
**Content:** Courier assigned, delivery status, tracking info

### 5. Delivery Update
**Trigger:** Delivery status changes (in_transit, delivered, failed)  
**Recipient:** Buyer & Seller  
**Template:** `templates.deliveryUpdate(order, delivery, product)`  
**Content:** Updated delivery status, real-time tracking link

### 6. Order Completed
**Trigger:** Delivery marked as delivered  
**Recipient:** Buyer  
**Template:** `templates.orderCompleted(order, product)`  
**Content:** Order completion, review request

### 7. Dispute Created
**Trigger:** Buyer or seller creates dispute  
**Recipient:** Both buyer and seller  
**Template:** `templates.disputeCreated(order, product, reason)`  
**Content:** Dispute notification, reason, admin review notice

### 8. Dispute Resolved
**Trigger:** Admin resolves dispute  
**Recipient:** Both buyer and seller  
**Template:** `templates.disputeResolved(order, product, resolution)`  
**Content:** Resolution details, outcome, refund info if applicable

### 9. New Offer Received
**Trigger:** Seller submits offer for buyer's request  
**Recipient:** Buyer  
**Template:** `templates.newOffer(bid, offer, product)`  
**Content:** Offer details, product info, acceptance link

### 10. Offer Accepted
**Trigger:** Buyer accepts seller's offer  
**Recipient:** Seller  
**Template:** `templates.offerAccepted(bid, product)`  
**Content:** Acceptance notification, next steps

## Usage Examples

### Sending a Single Email

```javascript
const { sendEmail, templates } = require('./lib/email');

// Send welcome email
await sendEmail({
  to: 'user@example.com',
  ...templates.welcome('John Doe'),
});
```

### Sending Custom Email

```javascript
await sendEmail({
  to: 'user@example.com',
  subject: 'Custom Subject',
  text: 'Plain text version',
  html: '<h1>HTML version</h1>',
});
```

### Async Email (Non-blocking)

All emails in controllers are sent asynchronously to avoid blocking API responses:

```javascript
// Don't block response while sending email
sendEmail({
  to: user.email,
  ...templates.welcome(user.username),
}).catch((error) => {
  logger.error('Failed to send email:', { error: error.message });
});

// Response sent immediately, email sends in background
res.json({ message: 'User registered successfully' });
```

## Email Integration Points

### Controllers with Email Notifications

1. **authController.js**
   - `register()` → Welcome email

2. **orderController.js**
   - `payOrder()` → Order confirmation (buyer) + Payment received (seller)
   - `createDispute()` → Dispute created (both parties)

3. **deliveryController.js**
   - `acceptDelivery()` → Delivery assigned (buyer + seller)
   - `updateDeliveryStatus()` → Delivery update + Order completed

4. **bidController.js**
   - `submitOffer()` → New offer (buyer)
   - `acceptOffer()` → Offer accepted (seller)

5. **adminController.js**
   - `resolveDispute()` → Dispute resolved (both parties)

## Testing Emails

### Development Mode (No SMTP Configured)

If SMTP credentials are not set, the system uses a mock transporter:

```javascript
// Mock email sent (logged but not delivered)
logger.info('Mock email sent:', {
  to: 'user@example.com',
  subject: 'Welcome to KODO!',
  preview: 'Hi John, Welcome to KODO!...',
});
```

### Using Mailtrap (Recommended for Testing)

Mailtrap catches all emails without delivering them to real addresses:

1. Sign up at [mailtrap.io](https://mailtrap.io)
2. Create an inbox
3. Get SMTP credentials
4. Update `.env`:
   ```bash
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your-mailtrap-username
   SMTP_PASSWORD=your-mailtrap-password
   ```

### Manual Testing

Test email sending with a simple script:

```javascript
// test-email.js
require('dotenv').config();
const { sendEmail, templates } = require('./src/lib/email');

async function testEmail() {
  try {
    const result = await sendEmail({
      to: 'test@example.com',
      ...templates.welcome('Test User'),
    });
    console.log('Email sent:', result);
  } catch (error) {
    console.error('Email failed:', error);
  }
}

testEmail();
```

Run: `node test-email.js`

## Email Template Customization

### Modifying Templates

Edit `server/src/lib/email.js` and update the `templates` object:

```javascript
templates: {
  welcome: (username) => ({
    subject: 'Welcome to KODO!',
    text: `Hi ${username}...`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Welcome ${username}!</h2>
        <!-- Add your custom HTML -->
      </div>
    `,
  }),
}
```

### Adding New Templates

```javascript
// In email.js templates object
myNewTemplate: (data) => ({
  subject: `Custom Subject - ${data.title}`,
  text: `Plain text version with ${data.value}`,
  html: `
    <div style="font-family: Arial, sans-serif;">
      <h2>${data.title}</h2>
      <p>${data.message}</p>
    </div>
  `,
}),
```

Use in controller:

```javascript
sendEmail({
  to: user.email,
  ...templates.myNewTemplate({ title: 'Test', value: '123', message: 'Hello!' }),
}).catch((error) => logger.error('Email failed', { error: error.message }));
```

## Email Styling Best Practices

1. **Inline CSS** - Email clients don't support `<style>` tags well
2. **Table-based layouts** - More reliable than flexbox/grid
3. **Web-safe fonts** - Arial, Helvetica, Georgia, Verdana
4. **Fallback colors** - Not all clients support modern color formats
5. **Alt text for images** - Always include descriptive alt text
6. **Plain text version** - Always provide text alternative
7. **Test across clients** - Gmail, Outlook, Apple Mail, etc.

## Troubleshooting

### Emails Not Sending

**Check SMTP credentials:**
```bash
node -e "require('dotenv').config(); console.log(process.env.SMTP_USER)"
```

**Test SMTP connection:**
```javascript
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

transporter.verify((error, success) => {
  console.log(error ? 'Error: ' + error : 'Server ready');
});
```

### Gmail "Less Secure Apps" Error

Gmail now requires **App Passwords**. Regular passwords won't work. Follow the Gmail Setup section above.

### Emails Going to Spam

1. Use a verified domain for `SMTP_FROM`
2. Set up SPF, DKIM, and DMARC records
3. Use a reputable SMTP provider (SendGrid, Mailgun, AWS SES)
4. Avoid spam trigger words in subject/body
5. Include unsubscribe link (required for bulk emails)

### Rate Limiting

Most SMTP providers have rate limits:
- **Gmail:** 500 emails/day (free), 2,000/day (Google Workspace)
- **SendGrid:** 100 emails/day (free), unlimited (paid)
- **Mailgun:** 5,000 emails/month (free)
- **AWS SES:** 62,000 emails/month (free tier)

For high volume, consider:
1. Queue emails using Bull/Redis
2. Batch sending with delays
3. Use transactional email service with higher limits

## Production Recommendations

### 1. Use Professional SMTP Service
Don't use Gmail in production. Use:
- **SendGrid** - Great for transactional emails
- **Mailgun** - Developer-friendly, good APIs
- **AWS SES** - Cost-effective for high volume
- **Postmark** - Excellent deliverability

### 2. Implement Email Queue
Use Redis + Bull for reliable email delivery:

```javascript
const Queue = require('bull');
const emailQueue = new Queue('email', process.env.REDIS_URL);

// Add to queue instead of direct send
emailQueue.add({ to, subject, html });

// Process queue
emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

### 3. Email Tracking
Track opens and clicks:
- Add tracking pixel for opens
- Use tracked links for clicks
- Store events in database

### 4. Unsubscribe Mechanism
Allow users to opt-out:
- Add unsubscribe link to all emails
- Store preferences in User model
- Check preferences before sending

### 5. Email Logs
Log all email events:
- Sent successfully
- Failed to send
- Bounced
- Marked as spam
- Opened/clicked (if tracking)

## Security Considerations

1. **Never expose SMTP credentials** in code or logs
2. **Validate email addresses** before sending
3. **Sanitize user input** in email content
4. **Rate limit** email sending per user
5. **Verify email ownership** with verification codes
6. **Use TLS/SSL** for SMTP connections (SMTP_SECURE=true for port 465)

## Related Documentation

- [API Reference](./API_REFERENCE.md) - All API endpoints
- [Socket.IO Guide](./SOCKET_IO_GUIDE.md) - Real-time notifications
- [Setup Guide](./SETUP.md) - Environment configuration

---

**Questions or issues?** Check the logs with `LOG_LEVEL=debug` for detailed email debugging information.
