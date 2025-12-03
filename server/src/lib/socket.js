const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

/**
 * Initialize Socket.IO server
 */
function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Socket connection attempted without token', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      logger.info('Socket authenticated', { socketId: socket.id, userId: decoded.id, role: decoded.role });
      next();
    } catch (error) {
      logger.error('Socket authentication failed', { socketId: socket.id, error: error.message });
      return next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userRole = socket.user.role;

    logger.info('Client connected', { socketId: socket.id, userId, role: userRole });

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-specific rooms
    socket.join(`role:${userRole}`);

    // If buyer, join buyers room
    if (userRole === 'buyer') {
      socket.join('buyers');
    }

    // If seller, join sellers room
    if (userRole === 'seller') {
      socket.join('sellers');
    }

    // If courier, join couriers room
    if (userRole === 'courier') {
      socket.join('couriers');
    }

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to KODO real-time server',
      userId,
      role: userRole,
      timestamp: new Date().toISOString(),
    });

    // Handle bid/request subscriptions
    socket.on('subscribeToRequest', (requestId) => {
      socket.join(`request:${requestId}`);
      logger.info('Subscribed to request', { socketId: socket.id, requestId });
      socket.emit('subscribed', { requestId });
    });

    socket.on('unsubscribeFromRequest', (requestId) => {
      socket.leave(`request:${requestId}`);
      logger.info('Unsubscribed from request', { socketId: socket.id, requestId });
      socket.emit('unsubscribed', { requestId });
    });

    // Handle order subscriptions
    socket.on('subscribeToOrder', (orderId) => {
      socket.join(`order:${orderId}`);
      logger.info('Subscribed to order', { socketId: socket.id, orderId });
      socket.emit('subscribed', { orderId });
    });

    socket.on('unsubscribeFromOrder', (orderId) => {
      socket.leave(`order:${orderId}`);
      logger.info('Unsubscribed from order', { socketId: socket.id, orderId });
      socket.emit('unsubscribed', { orderId });
    });

    // Handle delivery subscriptions
    socket.on('subscribeToDelivery', (deliveryId) => {
      socket.join(`delivery:${deliveryId}`);
      logger.info('Subscribed to delivery', { socketId: socket.id, deliveryId });
      socket.emit('subscribed', { deliveryId });
    });

    // Handle courier location updates
    socket.on('updateLocation', async (data) => {
      if (userRole !== 'courier') {
        socket.emit('error', { message: 'Only couriers can update location' });
        return;
      }

      const { lat, lng } = data;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        socket.emit('error', { message: 'Invalid coordinates' });
        return;
      }

      logger.info('Courier location updated', { socketId: socket.id, userId, lat, lng });

      // Update courier location in database
      try {
        await prisma.user.update({ 
          where: { id: userId }, 
          data: { 
            lastKnownLat: lat, 
            lastKnownLng: lng 
          } 
        });
      } catch (dbError) {
        logger.error('Failed to update courier location in database:', { 
          error: dbError.message, 
          userId 
        });
      }

      socket.emit('locationUpdated', { lat, lng, timestamp: new Date().toISOString() });
    });

    // Handle typing indicators (optional)
    socket.on('typing', (data) => {
      const { requestId } = data;
      socket.to(`request:${requestId}`).emit('userTyping', {
        userId,
        username: socket.user.username,
        requestId,
      });
    });

    socket.on('stopTyping', (data) => {
      const { requestId } = data;
      socket.to(`request:${requestId}`).emit('userStoppedTyping', {
        userId,
        requestId,
      });
    });

    // ===== CHAT EVENTS =====

    // Subscribe to conversation
    socket.on('chat:subscribe', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      logger.info('Subscribed to conversation', { socketId: socket.id, conversationId, userId });
      socket.emit('chat:subscribed', { conversationId });
    });

    // Unsubscribe from conversation
    socket.on('chat:unsubscribe', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      logger.info('Unsubscribed from conversation', { socketId: socket.id, conversationId, userId });
      socket.emit('chat:unsubscribed', { conversationId });
    });

    // Typing indicator for chat
    socket.on('chat:typing', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('chat:userTyping', {
        conversationId,
        userId,
        username: socket.user.username,
      });
    });

    // Stop typing indicator for chat
    socket.on('chat:stopTyping', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('chat:userStoppedTyping', {
        conversationId,
        userId,
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        userId,
        role: userRole,
        reason,
      });
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId,
        error: error.message,
      });
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
}

/**
 * Emit event to specific user
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
  logger.info('Emitted to user', { userId, event });
}

/**
 * Emit event to specific role
 */
function emitToRole(role, event, data) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
  logger.info('Emitted to role', { role, event });
}

/**
 * Emit event to specific room
 */
function emitToRoom(room, event, data) {
  if (!io) return;
  io.to(room).emit(event, data);
  logger.info('Emitted to room', { room, event });
}

/**
 * Broadcast new bid/request to all sellers
 */
function broadcastNewRequest(bid) {
  emitToRole('seller', 'newRequest', {
    bid,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify buyer of new offer
 */
function notifyNewOffer(buyerId, offer) {
  emitToUser(buyerId, 'newOffer', {
    offer,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify seller of accepted offer
 */
function notifyOfferAccepted(sellerId, data) {
  emitToUser(sellerId, 'offerAccepted', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast order update to relevant parties
 */
function broadcastOrderUpdate(order) {
  emitToRoom(`order:${order.id}`, 'orderUpdated', {
    order,
    timestamp: new Date().toISOString(),
  });
  
  // Also emit to buyer and seller
  emitToUser(order.buyerId, 'orderUpdated', { order });
  if (order.product?.sellerId) {
    emitToUser(order.product.sellerId, 'orderUpdated', { order });
  }
}

/**
 * Broadcast delivery update
 */
function broadcastDeliveryUpdate(delivery) {
  emitToRoom(`delivery:${delivery.id}`, 'deliveryUpdated', {
    delivery,
    timestamp: new Date().toISOString(),
  });

  // Also emit to courier and relevant order parties
  if (delivery.courierId) {
    emitToUser(delivery.courierId, 'deliveryUpdated', { delivery });
  }
}

/**
 * Notify available couriers of new delivery
 */
function notifyAvailableDelivery(delivery) {
  emitToRole('courier', 'newDelivery', {
    delivery,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify user of new chat message
 */
function notifyNewChatMessage(conversationId, message) {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('chat:newMessage', {
    conversationId,
    message,
    timestamp: new Date().toISOString(),
  });
  logger.info('New chat message emitted', { conversationId, messageId: message.id });
}

/**
 * Notify that messages were read
 */
function notifyChatMessagesRead(conversationId, readBy, count) {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('chat:messagesRead', {
    conversationId,
    readBy,
    count,
    timestamp: new Date().toISOString(),
  });
  logger.info('Messages read notification emitted', { conversationId, readBy, count });
}

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToRoom,
  broadcastNewRequest,
  notifyNewOffer,
  notifyOfferAccepted,
  broadcastOrderUpdate,
  broadcastDeliveryUpdate,
  notifyAvailableDelivery,
  notifyNewChatMessage,
  notifyChatMessagesRead,
};
