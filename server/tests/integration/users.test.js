const request = require('supertest');
const { app } = require('../../app');
const { 
  generateToken, 
  createTestUser, 
  cleanupTestData,
  disconnectPrisma,
  prisma
} = require('../helpers/testUtils');

describe('Users API', () => {
  let user, anotherUser;
  let userToken, anotherUserToken;

  beforeAll(async () => {
    user = await createTestUser({ 
      username: 'testuser1', 
      email: 'user1@test.com' 
    });
    userToken = generateToken(user.id, user.role);
    
    anotherUser = await createTestUser({ 
      username: 'testuser2', 
      email: 'user2@test.com' 
    });
    anotherUserToken = generateToken(anotherUser.id, anotherUser.role);
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  describe('GET /api/users/profile', () => {
    it('should get own profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update own profile', async () => {
      const updateData = {
        username: 'updatedusername',
        phone: '+2348012345678',
        location: 'Lagos, Nigeria'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(updateData.username);
      expect(response.body.data.user.phone).toBe(updateData.phone);
      expect(response.body.data.user.location).toBe(updateData.location);
    });

    it('should fail with duplicate username', async () => {
      const updateData = {
        username: anotherUser.username
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      const updateData = {
        email: anotherUser.email
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/password', () => {
    it('should change password with correct current password', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: passwordData.newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with weak new password', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: '123' // Too weak
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get public user profile', async () => {
      const response = await request(app)
        .get(`/api/users/${anotherUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(anotherUser.id);
      expect(response.body.data.user.username).toBe(anotherUser.username);
      // Should not include sensitive data
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('email');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should delete own account with correct password', async () => {
      const testUser = await createTestUser({ 
        username: 'deletetest', 
        email: 'delete@test.com' 
      });
      const testToken = generateToken(testUser.id, testUser.role);

      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ password: 'password123' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user is deleted
      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(user).toBeNull();
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ password: 'wrongpassword' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail without password', async () => {
      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
