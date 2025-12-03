const chatController = require('../../../src/controllers/chatController');
const prisma = require('../../../src/lib/prisma');

jest.mock('../../../src/lib/prisma', () => ({
  conversation: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}));

jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../../src/lib/socket', () => ({
  emitToUser: jest.fn(),
}));

describe('Chat Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: 'user123', role: 'buyer' },
      app: { get: jest.fn() }, // Mock Socket.IO
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    const mockConversations = [
      {
        id: 'conv1',
        user1Id: 'user123',
        user2Id: 'user456',
        user1: { id: 'user123', username: 'user1' },
        user2: { id: 'user456', username: 'user2' },
        messages: [{ content: 'Hello', createdAt: new Date(), read: false }],
        lastMessageAt: new Date(),
      },
    ];

    it('should get user conversations', async () => {
      prisma.conversation.findMany.mockResolvedValue(mockConversations);
      prisma.message.count.mockResolvedValue(1);

      await chatController.getConversations(req, res);

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { user1Id: 'user123' },
              { user2Id: 'user123' },
            ],
          },
          orderBy: { lastMessageAt: 'desc' },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'conv1',
            otherUser: expect.any(Object),
            lastMessage: expect.any(Object),
            unreadCount: 1,
          }),
        ])
      );
    });

    it('should calculate unread counts correctly', async () => {
      prisma.conversation.findMany.mockResolvedValue(mockConversations);
      prisma.message.count.mockResolvedValue(5);

      await chatController.getConversations(req, res);

      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv1',
          receiverId: 'user123',
          read: false,
        },
      });
    });

    it('should identify other user correctly', async () => {
      prisma.conversation.findMany.mockResolvedValue(mockConversations);
      prisma.message.count.mockResolvedValue(0);

      await chatController.getConversations(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response[0].otherUser).toEqual(mockConversations[0].user2);
    });

    it('should handle database errors', async () => {
      prisma.conversation.findMany.mockRejectedValue(new Error('Database error'));

      await chatController.getConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch conversations',
      });
    });
  });

  describe('getOrCreateConversation', () => {
    beforeEach(() => {
      req.params.otherUserId = 'user456';
    });

    it('should return existing conversation', async () => {
      const mockConversation = {
        id: 'conv1',
        user1Id: 'user123',
        user2Id: 'user456',
        user1: { id: 'user123', username: 'user1', email: 'user1@test.com', role: 'buyer' },
        user2: { id: 'user456', username: 'user2', email: 'user2@test.com', role: 'seller' },
        lastMessageAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue({ id: 'user456', username: 'user2' });
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);

      await chatController.getOrCreateConversation(req, res);

      expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { user1Id: 'user123', user2Id: 'user456' },
            { user1Id: 'user456', user2Id: 'user123' },
          ],
        },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith({
        id: 'conv1',
        otherUser: mockConversation.user2,
        lastMessageAt: mockConversation.lastMessageAt,
      });
    });

    it('should create new conversation if none exists', async () => {
      const newConversation = {
        id: 'conv2',
        user1Id: 'user123',
        user2Id: 'user456',
        user1: { id: 'user123', username: 'user1', email: 'user1@test.com', role: 'buyer' },
        user2: { id: 'user456', username: 'user2', email: 'user2@test.com', role: 'seller' },
        lastMessageAt: expect.any(Date),
      };

      prisma.user.findUnique.mockResolvedValue({ id: 'user456', username: 'user2' });
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(newConversation);

      await chatController.getOrCreateConversation(req, res);

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          user1Id: 'user123',
          user2Id: 'user456',
          lastMessageAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith({
        id: 'conv2',
        otherUser: newConversation.user2,
        lastMessageAt: expect.any(Date),
      });
    });

    it('should prevent conversation with self', async () => {
      req.params.otherUserId = 'user123';
      prisma.user.findUnique.mockResolvedValue({ id: 'user123' });

      await chatController.getOrCreateConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot create conversation with yourself',
      });
    });

    it('should return 404 if other user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await chatController.getOrCreateConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });
  });

  describe('getMessages', () => {
    const mockConversation = {
      id: 'conv1',
      user1Id: 'user123',
      user2Id: 'user456',
    };

    const mockMessages = [
      {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user123',
        content: 'Hello',
        createdAt: new Date(),
      },
      {
        id: 'msg2',
        conversationId: 'conv1',
        senderId: 'user456',
        content: 'Hi there',
        createdAt: new Date(),
      },
    ];

    beforeEach(() => {
      req.params.conversationId = 'conv1';
    });

    it('should get conversation messages', async () => {
      const mockConversation = {
        id: 'conv1',
        user1Id: 'user123',
        user2Id: 'user456',
      };
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      prisma.message.findMany.mockResolvedValue(mockMessages);
      prisma.message.count.mockResolvedValue(2);

      await chatController.getMessages(req, res);

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
      expect(res.json).toHaveBeenCalledWith({
        messages: mockMessages.reverse(),
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should enforce authorization', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);

      await chatController.getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Conversation not found or access denied',
      });
    });

    it('should handle pagination', async () => {
      req.query.page = '2';
      req.query.limit = '20';
      const mockConversation = {
        id: 'conv1',
        user1Id: 'user123',
        user2Id: 'user456',
      };
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      prisma.message.findMany.mockResolvedValue(mockMessages);
      prisma.message.count.mockResolvedValue(50);

      await chatController.getMessages(req, res);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            page: 2,
            limit: 20,
            total: 50,
            pages: 3,
          }),
        })
      );
    });

    it('should return 404 for non-existent conversation', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);

      await chatController.getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Conversation not found or access denied',
      });
    });
  });

  describe('sendMessage', () => {
    const mockConversation = {
      id: 'conv1',
      user1Id: 'user123',
      user2Id: 'user456',
    };

    beforeEach(() => {
      req.params.conversationId = 'conv1';
      req.body = { content: 'Hello, how are you?' };
    });

    it('should send message successfully', async () => {
      const mockConversation = {
        id: 'conv1',
        user1Id: 'user123',
        user2Id: 'user456',
      };
      const mockMessage = {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user123',
        receiverId: 'user456',
        content: 'Hello, how are you?',
        read: false,
        sender: { id: 'user123', username: 'user1', role: 'buyer' },
      };

      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      prisma.message.create.mockResolvedValue(mockMessage);

      await chatController.sendMessage(req, res);

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv1',
          senderId: 'user123',
          receiverId: 'user456',
          content: 'Hello, how are you?',
          read: false,
        },
        include: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockMessage);
    });

    it('should determine receiver correctly', async () => {
      const mockConversation = {
        id: 'conv1',
        user1Id: 'user456', // user123 is user2
        user2Id: 'user123',
      };
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      prisma.message.create.mockResolvedValue({});

      await chatController.sendMessage(req, res);

      const createCall = prisma.message.create.mock.calls[0][0];
      expect(createCall.data.receiverId).toBe('user456');
    });

    it('should fail with empty content', async () => {
      req.body.content = '';
      const mockConversation = {
        id: 'conv1',
        user1Id: 'user123',
        user2Id: 'user456',
      };
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);

      await chatController.sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Message content cannot be empty',
      });
    });

    it('should enforce authorization', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);

      await chatController.sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Conversation not found or access denied',
      });
    });
  });

  describe('markAsRead', () => {
    beforeEach(() => {
      req.params.conversationId = 'conv1';
    });

    it('should mark messages as read', async () => {
      const mockConversation = {
        id: 'conv1',
        user1Id: 'user123',
        user2Id: 'user456',
      };
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      prisma.message.updateMany.mockResolvedValue({ count: 3 });

      await chatController.markAsRead(req, res);

      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv1',
          receiverId: 'user123',
          read: false,
        },
        data: {
          read: true,
        },
      });
      expect(res.json).toHaveBeenCalledWith({ markedAsRead: 3 });
    });

    it('should return 404 for unauthorized conversation', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);

      await chatController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Conversation not found or access denied',
      });
    });
  });

  describe('deleteMessage', () => {
    const mockMessage = {
      id: 'msg1',
      senderId: 'user123',
      receiverId: 'user456',
      conversationId: 'conv1',
    };

    beforeEach(() => {
      req.params.messageId = 'msg1';
    });

    it('should delete own message', async () => {
      prisma.message.findUnique.mockResolvedValue(mockMessage);
      prisma.message.update.mockResolvedValue({ ...mockMessage, content: '[Message deleted]' });

      await chatController.deleteMessage(req, res);

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg1' },
        data: { content: '[Message deleted]' },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Message deleted successfully',
      });
    });

    it('should only allow sender to delete', async () => {
      mockMessage.senderId = 'otherUser';
      prisma.message.findUnique.mockResolvedValue(mockMessage);

      await chatController.deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not authorized to delete this message',
      });
    });

    it('should return 404 for non-existent message', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      await chatController.deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Message not found',
      });
    });
  });
});
