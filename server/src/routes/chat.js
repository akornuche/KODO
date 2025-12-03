const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const chatController = require('../controllers/chatController');

// All chat routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/chat/conversations
 * @desc    Get all conversations for authenticated user
 * @access  Private
 */
router.get('/conversations', chatController.getConversations);

/**
 * @route   GET /api/chat/conversations/:otherUserId
 * @desc    Get or create conversation with another user
 * @access  Private
 */
router.get('/conversations/:otherUserId', chatController.getOrCreateConversation);

/**
 * @route   GET /api/chat/:conversationId/messages
 * @desc    Get messages for a conversation (paginated)
 * @access  Private (must be participant)
 */
router.get('/:conversationId/messages', chatController.getMessages);

/**
 * @route   POST /api/chat/:conversationId/messages
 * @desc    Send a message in a conversation
 * @access  Private (must be participant)
 */
router.post(
  '/:conversationId/messages',
  [
    body('content')
      .trim()
      .notEmpty().withMessage('Message content is required')
      .isLength({ max: 5000 }).withMessage('Message content too long (max 5000 characters)')
  ],
  handleValidationErrors,
  chatController.sendMessage
);

/**
 * @route   PUT /api/chat/:conversationId/read
 * @desc    Mark all messages in conversation as read
 * @access  Private (must be participant)
 */
router.put('/:conversationId/read', chatController.markAsRead);

/**
 * @route   DELETE /api/chat/messages/:messageId
 * @desc    Delete a message (soft delete)
 * @access  Private (must be sender or admin)
 */
router.delete('/messages/:messageId', chatController.deleteMessage);

module.exports = router;
