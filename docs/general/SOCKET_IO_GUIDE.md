# Socket.IO Real-Time Integration Guide

## Overview

KODO uses Socket.IO for real-time bidirectional communication between clients and the server. This enables instant notifications for bids, offers, orders, and delivery updates.

## Architecture

- **Server**: Socket.IO server integrated with Express HTTP server
- **Authentication**: JWT-based authentication via handshake
- **Rooms**: Dynamic rooms for users, roles, requests, orders, and deliveries
- **Events**: Standardized event naming and payload structure

---

## Client Connection

### Authentication

Clients must provide a JWT token when connecting:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket', 'polling']
});
```

Alternative (Authorization header):

```javascript
const socket = io('http://localhost:4000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token-here'
  }
});
```

### Connection Events

#### `connected`
Emitted by server when client successfully connects:

```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // data = {
  //   message: 'Connected to KODO real-time server',
  //   userId: '123',
  //   role: 'buyer',
  //   timestamp: '2024-01-15T10:30:00.000Z'
  // }
});
```

#### `disconnect`
Triggered when connection is lost:

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // reason = 'transport close', 'ping timeout', etc.
});
```

#### `error`
Connection or authentication errors:

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // 'Authentication required', 'Invalid token', etc.
});
```

---

## Rooms & Subscriptions

### Automatic Rooms

When a client connects, they are automatically joined to:

- `user:{userId}` - Personal room for user-specific notifications
- `role:{role}` - Role-specific room (buyer, seller, courier, admin)
- `buyers`, `sellers`, or `couriers` - Simplified role rooms

### Manual Subscriptions

#### Subscribe to Request/Bid

```javascript
socket.emit('subscribeToRequest', 'request-id-123');

socket.on('subscribed', (data) => {
  console.log('Subscribed:', data);
  // data = { requestId: 'request-id-123' }
});
```

#### Unsubscribe from Request

```javascript
socket.emit('unsubscribeFromRequest', 'request-id-123');

socket.on('unsubscribed', (data) => {
  console.log('Unsubscribed:', data);
});
```

#### Subscribe to Order

```javascript
socket.emit('subscribeToOrder', 'order-id-456');

socket.on('subscribed', (data) => {
  // data = { orderId: 'order-id-456' }
});
```

#### Subscribe to Delivery

```javascript
socket.emit('subscribeToDelivery', 'delivery-id-789');

socket.on('subscribed', (data) => {
  // data = { deliveryId: 'delivery-id-789' }
});
```

---

## Core Events

### Bid/Request Events

#### `newRequest` (Sellers receive)
Broadcasted when a buyer posts a new request:

```javascript
socket.on('newRequest', (data) => {
  console.log('New request posted:', data);
  // data = {
  //   bid: {
  //     id: 'bid-123',
  //     productId: 'prod-456' | null,
  //     buyerId: 'user-789',
  //     amount: 50.00,
  //     message: 'Looking for...',
  //     status: 'open',
  //     buyer: { id, username, email },
  //     product: { id, title, price } | null
  //   },
  //   timestamp: '2024-01-15T10:30:00.000Z'
  // }
});
```

#### `newOffer` (Buyer receives)
Sent when a seller submits an offer:

```javascript
socket.on('newOffer', (data) => {
  console.log('New offer received:', data);
  // data = {
  //   offer: {
  //     id: 'order-123',
  //     buyerId: 'user-789',
  //     productId: 'prod-456',
  //     quantity: 1,
  //     totalAmount: 45.00,
  //     status: 'pending',
  //     buyer: { id, username, email },
  //     product: { id, title, price, seller: {...} }
  //   },
  //   message: 'Seller message',
  //   bid: { ... },
  //   timestamp: '2024-01-15T10:31:00.000Z'
  // }
});
```

#### `offerAccepted` (Seller receives)
Sent when buyer accepts an offer:

```javascript
socket.on('offerAccepted', (data) => {
  console.log('Offer accepted:', data);
  // data = {
  //   bid: { id, status: 'accepted', ... },
  //   order: { id, status: 'pending', ... },
  //   timestamp: '2024-01-15T10:32:00.000Z'
  // }
});
```

### Order Events

#### `orderUpdated`
Broadcasted when order status changes:

```javascript
socket.on('orderUpdated', (data) => {
  console.log('Order updated:', data);
  // data = {
  //   order: {
  //     id: 'order-123',
  //     status: 'paid', // pending -> paid -> shipped -> completed
  //     buyerId: 'user-789',
  //     productId: 'prod-456',
  //     totalAmount: 45.00,
  //     product: { ... },
  //     buyer: { ... },
  //     escrow: { ... } | null,
  //     delivery: { ... } | null
  //   },
  //   timestamp: '2024-01-15T10:35:00.000Z'
  // }
});
```

### Delivery Events

#### `newDelivery` (Couriers receive)
Broadcasted when a new delivery is available:

```javascript
socket.on('newDelivery', (data) => {
  console.log('New delivery available:', data);
  // data = {
  //   delivery: {
  //     id: 'delivery-123',
  //     orderId: 'order-456',
  //     status: 'pending',
  //     pickupAddress: '...',
  //     deliveryAddress: '...',
  //     order: { ... }
  //   },
  //   timestamp: '2024-01-15T10:40:00.000Z'
  // }
});
```

#### `deliveryUpdated`
Broadcasted when delivery status changes:

```javascript
socket.on('deliveryUpdated', (data) => {
  console.log('Delivery updated:', data);
  // data = {
  //   delivery: {
  //     id: 'delivery-123',
  //     status: 'in_transit', // pending -> assigned -> in_transit -> delivered
  //     courierId: 'user-999',
  //     courier: { id, username, email, lastKnownLat, lastKnownLng }
  //   },
  //   timestamp: '2024-01-15T10:45:00.000Z'
  // }
});
```

---

## Courier-Specific Events

### Update Location

Couriers can broadcast their GPS location:

```javascript
socket.emit('updateLocation', {
  lat: 40.7128,
  lng: -74.0060
});

socket.on('locationUpdated', (data) => {
  console.log('Location updated:', data);
  // data = {
  //   lat: 40.7128,
  //   lng: -74.0060,
  //   timestamp: '2024-01-15T10:50:00.000Z'
  // }
});
```

**Notes:**
- Only couriers can update location
- Location is saved to database (User.lastKnownLat, User.lastKnownLng)
- Used for proximity-based courier assignment

---

## Optional Features

### Typing Indicators

For chat/messaging features:

```javascript
// Start typing
socket.emit('typing', { requestId: 'bid-123' });

// Stop typing
socket.emit('stopTyping', { requestId: 'bid-123' });

// Listen for other users typing
socket.on('userTyping', (data) => {
  // data = { userId, username, requestId }
});

socket.on('userStoppedTyping', (data) => {
  // data = { userId, requestId }
});
```

### Connection Health Check

```javascript
socket.emit('ping');

socket.on('pong', (data) => {
  console.log('Pong received:', data.timestamp);
});
```

---

## Event Flow Examples

### Complete Bid/Order Flow

```
1. Buyer posts request
   → Server emits: newRequest → All sellers

2. Seller submits offer
   → Server emits: newOffer → Specific buyer (user:{buyerId})

3. Buyer accepts offer
   → Server emits: offerAccepted → Specific seller (user:{sellerId})
   → Server emits: orderUpdated → Both parties (order:{orderId})

4. Buyer pays order
   → Server emits: orderUpdated → Both parties
   → Server emits: newDelivery → All couriers (role:courier)

5. Courier accepts delivery
   → Server emits: deliveryUpdated → Buyer, Seller, Courier

6. Courier updates location
   → Server emits: deliveryUpdated → Subscribed users (delivery:{deliveryId})

7. Order completed
   → Server emits: orderUpdated → All parties
   → Server emits: deliveryUpdated → All parties
```

---

## Error Handling

### Server Errors

```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
  // data = { message: 'Only couriers can update location' }
});
```

### Reconnection

```javascript
socket.io.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.io.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt:', attemptNumber);
});

socket.io.on('reconnect_failed', () => {
  console.error('Reconnection failed');
});
```

---

## Best Practices

### 1. Subscribe to Relevant Rooms

Only subscribe to rooms you need to reduce unnecessary network traffic:

```javascript
// Good: Subscribe when viewing specific request
socket.emit('subscribeToRequest', requestId);

// Good: Unsubscribe when leaving view
socket.emit('unsubscribeFromRequest', requestId);
```

### 2. Handle Reconnection

Resubscribe to rooms after reconnection:

```javascript
socket.on('connect', () => {
  if (currentRequestId) {
    socket.emit('subscribeToRequest', currentRequestId);
  }
  if (currentOrderId) {
    socket.emit('subscribeToOrder', currentOrderId);
  }
});
```

### 3. Update UI Reactively

Integrate Socket.IO with your state management:

```javascript
// Vue 3 + Pinia example
socket.on('newOffer', (data) => {
  store.addOffer(data.offer);
  showNotification('New offer received!');
});
```

### 4. Graceful Degradation

Don't rely solely on Socket.IO - implement polling fallback:

```javascript
socket.on('disconnect', () => {
  // Start polling API
  pollingInterval = setInterval(fetchOrders, 5000);
});

socket.on('connect', () => {
  // Stop polling
  clearInterval(pollingInterval);
});
```

---

## Security Considerations

1. **Authentication Required**: All connections must provide valid JWT
2. **Role Verification**: Server validates user roles before emitting events
3. **Room Isolation**: Users only receive events they're authorized for
4. **Rate Limiting**: Connection rate limiting (handled by Express middleware)
5. **Input Validation**: All client-emitted data is validated server-side

---

## Testing Socket.IO

### Using Socket.IO Client

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Test subscription
  socket.emit('subscribeToRequest', 'test-request-id');
  
  // Wait for events
  socket.on('newRequest', (data) => {
    console.log('Received newRequest:', data);
  });
});
```

### Using Postman

Postman now supports Socket.IO connections:

1. Create new Socket.IO request
2. Set URL: `http://localhost:4000`
3. Add auth token in handshake
4. Subscribe to events
5. Emit test events

---

## Frontend Integration (Vue 3)

### Install Socket.IO Client

```bash
npm install socket.io-client
```

### Create Socket Plugin

```javascript
// src/plugins/socket.js
import { io } from 'socket.io-client';

export default {
  install(app) {
    const token = localStorage.getItem('token');
    
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    app.config.globalProperties.$socket = socket;
    app.provide('socket', socket);
  }
};
```

### Use in Components

```vue
<script setup>
import { inject, onMounted, onUnmounted } from 'vue';

const socket = inject('socket');

onMounted(() => {
  socket.on('newRequest', handleNewRequest);
  socket.on('newOffer', handleNewOffer);
});

onUnmounted(() => {
  socket.off('newRequest', handleNewRequest);
  socket.off('newOffer', handleNewOffer);
});

function handleNewRequest(data) {
  console.log('New request:', data);
  // Update state, show notification, etc.
}
</script>
```

---

## Troubleshooting

### Connection Fails

- Check JWT token is valid
- Verify CORS settings in server
- Check firewall/proxy settings
- Ensure Socket.IO versions match (server: 4.x, client: 4.x)

### Not Receiving Events

- Verify you're subscribed to the correct room
- Check server logs for emission confirmation
- Ensure event names match exactly (case-sensitive)
- Verify your role has permission for that event

### High Latency

- Use WebSocket transport only: `transports: ['websocket']`
- Check network conditions
- Review server resource usage
- Consider using Redis adapter for scaling

---

## Next Steps

- **Task 11**: Orders & Escrow API
- **Task 12**: Stripe Payment Integration
- **Task 13**: Delivery System with Courier Assignment
- **Frontend**: Implement Socket.IO in Vue 3 client

---

## Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
- [JWT Authentication](https://jwt.io/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
