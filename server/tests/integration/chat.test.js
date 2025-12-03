const request = require('supertest');
const { app } = require('../../app');
const { 
  generateToken, 
  createTestUser, 
  cleanupTestData,
  disconnectPrisma,
  prisma
} = require('../helpers/testUtils');

describe('Chat API', () => {
  let user1, user2, user3;
  let user1Token, user2Token, user3Token;
  let conversation;

  beforeAll(async () => {
    user1 = await createTestUser({ 
      username: 'user1', 
      email: 'user1@test.com' 
    });
    user1Token = generateToken(user1.id, user1.role);
    
    user2 = await createTestUser({ 
      username: 'user2', 
      email: 'user2@test.com' 
    });
    user2Token = generateToken(user2.id, user2.role);

    user3 = await createTestUser({ 
      username: 'user3', 
      email: 'user3@test.com' 
    });
    user3Token = generateToken(user3.id, user3.role);
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
  });

  describe('POST /api/chat/conversations', () => {
    it('should create a new conversation', async () => {
      const conversationData = {
        participantId: user2.id
      };

      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(conversationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation).toHaveProperty('id');
      expect(response.body.data.conversation.participants).toHaveLength(2);
    });

    it('should return existing conversation if already exists', async () => {
      // Create first conversation
      const firstResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2.id })
        .expect(201);

      // Try to create duplicate
      const secondResponse = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2.id })
        .expect(200);

      expect(secondResponse.body.data.conversation.id).toBe(
        firstResponse.body.data.conversation.id
      );
    });

    it('should fail to create conversation with self', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user1.id })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/conversations', () => {
    beforeEach(async () => {
      // Create test conversations
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: user1.id }, { id: user2.id }]
          }
        }
      });

      await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: user1.id }, { id: user3.id }]
          }
        }
      });
    });

    it('should get user\'s conversations', async () => {
      const response = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.conversations)).toBe(true);
      expect(response.body.data.conversations.length).toBe(2);
    });

    it('should return empty array if no conversations', async () => {
      const newUser = await createTestUser({ 
        username: 'newuser', 
        email: 'new@test.com' 
      });
      const newUserToken = generateToken(newUser.id, newUser.role);

      const response = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations.length).toBe(0);
    });
  });

  describe('GET /api/chat/conversations/:id', () => {
    beforeEach(async () => {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: user1.id }, { id: user2.id }]
          }
        }
      });
    });

    it('should get conversation details', async () => {
      const response = await request(app)
        .get(`/api/chat/conversations/${conversation.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation.id).toBe(conversation.id);
      expect(response.body.data.conversation).toHaveProperty('participants');
    });

    it('should fail for non-participant', async () => {
      const response = await request(app)
        .get(`/api/chat/conversations/${conversation.id}`)
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/conversations/:id/messages', () => {
    beforeEach(async () => {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: user1.id }, { id: user2.id }]
          }
        }
      });

      // Create test messages
      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            senderId: user1.id,
            content: 'Hello!',
            createdAt: new Date('2025-01-01T10:00:00')
          },
          {
            conversationId: conversation.id,
            senderId: user2.id,
            content: 'Hi there!',
            createdAt: new Date('2025-01-01T10:05:00')
          },
          {
            conversationId: conversation.id,
            senderId: user1.id,
            content: 'How are you?',
            createdAt: new Date('2025-01-01T10:10:00')
          }
        ]
      });
    });

    it('should get conversation messages', async () => {
      const response = await request(app)
        .get(`/api/chat/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.messages)).toBe(true);
      expect(response.body.data.messages.length).toBe(3);
    });

    it('should paginate messages', async () => {
      const response = await request(app)
        .get(`/api/chat/conversations/${conversation.id}/messages?limit=2`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages.length).toBe(2);
    });

    it('should fail for non-participant', async () => {
      const response = await request(app)
        .get(`/api/chat/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/chat/conversations/:id/messages', () => {
    beforeEach(async () => {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: user1.id }, { id: user2.id }]
          }
        }
      });
    });

    it('should send a message', async () => {
      const messageData = {
        content: 'Hello from test!'
      };

      const response = await request(app)
        .post(`/api/chat/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toHaveProperty('id');
      expect(response.body.data.message.content).toBe(messageData.content);
      expect(response.body.data.message.senderId).toBe(user1.id);
    });

    it('should fail with empty message', async () => {
      const response = await request(app)
        .post(`/api/chat/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-participant', async () => {
      const response = await request(app)
        .post(`/api/chat/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ content: 'Test' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/chat/messages/:id/read', () => {
    let message;

    beforeEach(async () => {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: user1.id }, { id: user2.id }]
          }
        }
      });

      message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user1.id,
          content: 'Test message',
          isRead: false
        }
      });
    });

    it('should mark message as read', async () => {
      const response = await request(app)
        .patch(`/api/chat/messages/${message.id}/read`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.isRead).toBe(true);
    });

    it('should fail for message sender', async () => {
      const response = await request(app)
        .patch(`/api/chat/messages/${message.id}/read`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-participant', async () => {
      const response = await request(app)
        .patch(`/api/chat/messages/${message.id}/read`)
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/chat/messages/:id', () => {
    let message;

    beforeEach(async () => {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: user1.id }, { id: user2.id }]
          }
        }
      });

      message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user1.id,
          content: 'Test message'
        }
      });
    });

    it('should delete own message', async () => {
      const response = await request(app)
        .delete(`/api/chat/messages/${message.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deletedMessage = await prisma.message.findUnique({
        where: { id: message.id }
      });
      expect(deletedMessage).toBeNull();
    });

    it('should fail to delete another user\'s message', async () => {
      const response = await request(app)
        .delete(`/api/chat/messages/${message.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
