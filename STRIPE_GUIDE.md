# Stripe Payment Integration Guide

## Overview

KODO uses Stripe for secure payment processing and escrow management. This guide covers setup, testing, and production deployment.

---

## Quick Start (Test Mode)

### 1. Get Stripe Test Keys

1. Sign up at [stripe.com](https://stripe.com)
2. Go to **Developers** → **API Keys**
3. Copy your **Test Mode** keys:
   - `Publishable key` (starts with `pk_test_`)
   - `Secret key` (starts with `sk_test_`)

### 2. Configure Environment

```bash
# server/.env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Install Stripe Package

```bash
cd server
npm install stripe
```

### 4. Run Database Migration

The Stripe integration adds two new fields to the database:

```bash
npx prisma migrate dev --name add-stripe-fields
```

This adds:
- `User.stripeAccountId` - Stripe connected account ID for sellers
- `Escrow.paymentIntentId` - Link escrow to Stripe payment intent

---

## Payment Flow

### 1. Buyer Places Order

```
POST /api/orders/:orderId/pay
Authorization: Bearer <buyer-jwt>
Content-Type: application/json

{
  "paymentMethodId": "pm_card_visa" // Stripe payment method ID
}
```

**Backend Process:**
1. Verify order belongs to buyer
2. Create Stripe Payment Intent
3. Charge payment method
4. Create Escrow record
5. Update order status to `paid`
6. Broadcast Socket.IO event

**Response:**
```json
{
  "message": "Payment successful",
  "order": {
    "id": "order-123",
    "status": "paid",
    "totalAmount": 45.99,
    "escrow": {
      "id": "escrow-456",
      "amount": 45.99,
      "released": false,
      "paymentIntentId": "pi_xxx"
    }
  }
}
```

### 2. Funds Held in Escrow

- Funds are held by Stripe in escrow
- Order status: `paid`
- Escrow status: `released = false`

### 3. Order Completed & Funds Released

**Manual Release (Admin):**
```
POST /api/orders/escrow/:escrowId/release
Authorization: Bearer <admin-jwt>
```

**Auto-Release (Order Completed):**
- Triggered when order status updated to `completed`
- Automatically transfers funds to seller's Stripe connected account

**Transfer Process:**
```javascript
// Backend automatically:
1. Mark escrow as released
2. Create Stripe Transfer to seller's connected account
3. Log transfer details
4. Notify seller via Socket.IO
```

---

## Test Cards

Use these cards in test mode (any future expiry date, any CVC):

| Card Number         | Brand      | Result  |
|---------------------|------------|---------|
| 4242 4242 4242 4242 | Visa       | Success |
| 4000 0000 0000 9995 | Visa       | Decline |
| 4000 0025 0000 3155 | Visa       | 3D Secure (auth required) |
| 5555 5555 5555 4444 | Mastercard | Success |
| 3782 822463 10005   | Amex       | Success |

---

## API Endpoints

### Pay for Order
```
POST /api/orders/:id/pay
```

**Request:**
```json
{
  "paymentMethodId": "pm_card_visa" // Optional for immediate payment
}
```

**Response:**
```json
{
  "message": "Payment successful",
  "order": { /* order with escrow */ },
  "escrow": { /* escrow details */ }
}
```

**Errors:**
- `404 ORDER_NOT_FOUND` - Order doesn't exist
- `403 FORBIDDEN` - Not the buyer
- `400 INVALID_ORDER_STATUS` - Order not in pending status
- `400 ALREADY_PAID` - Order already paid
- `400 PAYMENT_INCOMPLETE` - Stripe payment failed
- `400 STRIPE_ERROR` - Payment processing error

### Release Escrow (Admin)
```
POST /api/orders/escrow/:id/release
```

**Response:**
```json
{
  "message": "Escrow funds released successfully",
  "escrow": {
    "id": "escrow-123",
    "released": true,
    "releasedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

## Webhook Integration

### Why Webhooks?

Webhooks ensure payment events are reliably processed even if:
- Server is temporarily down during payment
- Network issues occur
- Async payment methods are used (bank transfers, etc.)

### Setup Webhooks (Test Mode)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to http://localhost:4000/api/webhooks/stripe
   ```
4. Copy the webhook secret (`whsec_xxx`) and add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

### Webhook Events Handled

| Event | Description | Action |
|-------|-------------|--------|
| `payment_intent.succeeded` | Payment completed | Mark order as paid, create escrow |
| `payment_intent.payment_failed` | Payment failed | Log error, notify buyer |
| `transfer.created` | Funds sent to seller | Log transfer details |
| `transfer.failed` | Transfer to seller failed | Alert admin, retry |
| `charge.refunded` | Payment refunded | Mark order as cancelled |

### Testing Webhooks

```bash
# Trigger test event
stripe trigger payment_intent.succeeded

# View webhook logs
stripe logs tail
```

---

## Frontend Integration

### Install Stripe.js

```bash
cd client
npm install @stripe/stripe-js
```

### Create Payment Form

```vue
<script setup>
import { loadStripe } from '@stripe/stripe-js';
import { ref } from 'vue';
import api from '@/services/api';

const stripe = await loadStripe('pk_test_your_publishable_key');
const elements = stripe.elements();
const cardElement = ref(null);
const loading = ref(false);
const error = ref('');

onMounted(() => {
  cardElement.value = elements.create('card');
  cardElement.value.mount('#card-element');
});

async function handlePayment(orderId) {
  loading.value = true;
  error.value = '';

  try {
    // Create payment method
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement.value,
    });

    if (stripeError) {
      error.value = stripeError.message;
      return;
    }

    // Send payment method to backend
    const response = await api.post(`/orders/${orderId}/pay`, {
      paymentMethodId: paymentMethod.id,
    });

    console.log('Payment successful:', response.data);
    // Redirect to order confirmation page
  } catch (err) {
    error.value = err.response?.data?.message || 'Payment failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <div id="card-element"></div>
    <p v-if="error" class="error">{{ error }}</p>
    <button @click="handlePayment(orderId)" :disabled="loading">
      {{ loading ? 'Processing...' : 'Pay Now' }}
    </button>
  </div>
</template>
```

---

## Stripe Connected Accounts (Seller Payouts)

### Overview

Sellers must create Stripe Connected Accounts to receive payouts when escrow is released.

### Implementation Flow

1. **Seller Initiates Connection:**
   ```
   POST /api/sellers/stripe-connect
   ```

2. **Backend Creates Account Link:**
   ```javascript
   const accountLink = await stripe.accountLinks.create({
     account: seller.stripeAccountId,
     refresh_url: 'https://kodo.com/seller/stripe-reauth',
     return_url: 'https://kodo.com/seller/dashboard',
     type: 'account_onboarding',
   });
   
   // Return accountLink.url to frontend
   ```

3. **Seller Completes Onboarding:**
   - Redirected to Stripe onboarding
   - Provides bank account details
   - Verifies identity

4. **Save Stripe Account ID:**
   ```javascript
   await prisma.user.update({
     where: { id: sellerId },
     data: { stripeAccountId: account.id },
   });
   ```

### Testing Connected Accounts

Use test bank accounts:
- **Account Number:** `000123456789`
- **Routing Number:** `110000000`

---

## Error Handling

### Common Errors

1. **Card Declined**
   ```json
   {
     "error": true,
     "code": "STRIPE_ERROR",
     "message": "Payment processing failed",
     "details": "Your card was declined."
   }
   ```

2. **Insufficient Funds**
   ```json
   {
     "error": true,
     "code": "STRIPE_ERROR",
     "message": "Payment processing failed",
     "details": "Your card has insufficient funds."
   }
   ```

3. **Authentication Required**
   ```json
   {
     "error": true,
     "code": "PAYMENT_INCOMPLETE",
     "paymentStatus": "requires_action"
   }
   ```
   
   **Solution:** Use `stripe.confirmCardPayment()` on frontend to handle 3D Secure

---

## Security Best Practices

1. **Never expose secret key in frontend:**
   - ❌ Don't: Use `sk_test_xxx` in client-side code
   - ✅ Do: Use `pk_test_xxx` publishable key only

2. **Validate webhook signatures:**
   - Already implemented in `/api/webhooks/stripe`
   - Prevents fake webhook requests

3. **Use HTTPS in production:**
   - Required for Stripe webhooks
   - Configure SSL certificate

4. **Implement idempotency:**
   - Prevents duplicate charges
   - Already handled by Stripe Payment Intents

5. **Store minimal card data:**
   - ❌ Never store raw card numbers
   - ✅ Store only `paymentMethodId` from Stripe

---

## Production Deployment

### 1. Switch to Live Mode

1. Get **Live API Keys** from Stripe Dashboard
2. Update `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_live_your_live_key
   STRIPE_WEBHOOK_SECRET=whsec_live_your_webhook_secret
   ```

### 2. Configure Live Webhooks

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add Endpoint**
3. Set URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `transfer.created`
   - `transfer.failed`
   - `charge.refunded`
5. Copy webhook secret to `.env`

### 3. Test End-to-End

1. Make test purchase with real card
2. Verify webhook events received
3. Check escrow created
4. Test fund release to seller

### 4. Monitor

- **Stripe Dashboard:** View payments, disputes, transfers
- **Server Logs:** Check for Stripe errors
- **Webhook Logs:** Ensure events processed

---

## Troubleshooting

### Webhook Not Receiving Events

1. Check URL is publicly accessible (use ngrok for local testing)
2. Verify `STRIPE_WEBHOOK_SECRET` matches dashboard
3. Check Stripe webhook logs in dashboard
4. Ensure endpoint is before `express.json()` middleware

### Payment Fails Silently

1. Check server logs for Stripe errors
2. Verify `STRIPE_SECRET_KEY` is set
3. Test with Stripe CLI: `stripe trigger payment_intent.succeeded`

### Transfer to Seller Fails

1. Verify seller has `stripeAccountId` set
2. Check seller completed Stripe onboarding
3. Ensure seller's account is active and verified
4. Check Stripe transfer logs for specific error

---

## Cost Structure

### Stripe Fees (US)

- **Card Payments:** 2.9% + $0.30 per transaction
- **International Cards:** +1.5%
- **Payouts to Sellers:** Free (US bank accounts)
- **Disputes:** $15 per dispute (refunded if you win)

### Example Transaction

- **Order Total:** $45.99
- **Stripe Fee:** $1.64 (2.9% + $0.30)
- **Platform Revenue:** Configure in transfer (optional)
- **Seller Receives:** Depends on platform commission

---

## Next Steps

- **Task 13:** Delivery System with Courier Assignment
- **Task 14:** Admin Dashboard (Stripe analytics, refunds, disputes)
- **Task 15:** Refund & Dispute Handling
- **Frontend:** Implement payment UI with Stripe Elements

---

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Payment Intents API](https://stripe.com/docs/payments/payment-intents)
- [Connected Accounts](https://stripe.com/docs/connect)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
