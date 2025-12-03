const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Get all conversations for the authenticated user
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: {
        user1: {
          select: { id: true, username: true, email: true, role: true }
        },
        user2: {
          select: { id: true, username: true, email: true, role: true }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            createdAt: true,
            read: true,
            senderId: true
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    });

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: userId,
            read: false
          }
        });

        // Determine the other user
        const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
        
        return {
          id: conv.id,
          otherUser,
          lastMessage: conv.messages[0] || null,
          lastMessageAt: conv.lastMessageAt,
          unreadCount
        };
      })
    );

    logger.info(`Retrieved ${conversationsWithUnread.length} conversations`, { userId });
    res.json(conversationsWithUnread);

  } catch (error) {
    logger.error('Error fetching conversations', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

/**
 * Get or create a conversation with another user
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    if (userId === otherUserId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Check if other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, username: true, email: true, role: true }
    });

    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find existing conversation (either direction)
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: userId }
        ]
      },
      include: {
        user1: {
          select: { id: true, username: true, email: true, role: true }
        },
        user2: {
          select: { id: true, username: true, email: true, role: true }
        }
      }
    });

    // Create if doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          user1Id: userId,
          user2Id: otherUserId,
          lastMessageAt: new Date()
        },
        include: {
          user1: {
            select: { id: true, username: true, email: true, role: true }
          },
          user2: {
            select: { id: true, username: true, email: true, role: true }
          }
        }
      });

      logger.info('Created new conversation', { conversationId: conversation.id, userId, otherUserId });
    }

    // Return conversation with other user info
    const otherUserData = conversation.user1Id === userId ? conversation.user2 : conversation.user1;
    
    res.json({
      id: conversation.id,
      otherUser: otherUserData,
      lastMessageAt: conversation.lastMessageAt
    });

  } catch (error) {
    logger.error('Error getting/creating conversation', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to get conversation' });
  }
};

/**
 * Get messages for a specific conversation
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Verify user is part of the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, username: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalMessages = await prisma.message.count({
      where: { conversationId }
    });

    logger.info(`Retrieved ${messages.length} messages`, { conversationId, userId });
    
    res.json({
      messages: messages.reverse(), // Return oldest to newest
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching messages', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * Send a message (creates message record, Socket.IO handles real-time delivery)
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Message content too long (max 5000 characters)' });
    }

    // Verify user is part of the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    // Determine receiver
    const receiverId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        receiverId,
        content: content.trim(),
        read: false
      },
      include: {
        sender: {
          select: { id: true, username: true, role: true }
        }
      }
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    });

    logger.info('Message sent', { 
      messageId: message.id, 
      conversationId, 
      senderId: userId, 
      receiverId 
    });

    // Socket.IO will handle real-time delivery (emit to receiver)
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${receiverId}`).emit('chat:newMessage', {
        conversationId,
        message: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          sender: message.sender,
          createdAt: message.createdAt,
          read: false
        }
      });
    }

    res.status(201).json(message);

  } catch (error) {
    logger.error('Error sending message', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to send message' });
  }
};

/**
 * Mark messages as read
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Verify user is part of the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    // Mark all unread messages where user is receiver as read
    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        read: false
      },
      data: {
        read: true
      }
    });

    logger.info(`Marked ${result.count} messages as read`, { conversationId, userId });

    // Notify sender via Socket.IO
    const io = req.app.get('io');
    if (io && result.count > 0) {
      const senderId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
      io.to(`user:${senderId}`).emit('chat:messagesRead', {
        conversationId,
        readBy: userId,
        count: result.count
      });
    }

    res.json({ markedAsRead: result.count });

  } catch (error) {
    logger.error('Error marking messages as read', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

/**
 * Delete a message (soft delete - marks as deleted, doesn't remove)
 */
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender or admin can delete
    if (message.senderId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Soft delete by updating content
    await prisma.message.update({
      where: { id: messageId },
      data: { content: '[Message deleted]' }
    });

    logger.info('Message deleted', { messageId, userId });

    // Notify via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${message.receiverId}`).emit('chat:messageDeleted', {
        conversationId: message.conversationId,
        messageId
      });
    }

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    logger.error('Error deleting message', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage
};
