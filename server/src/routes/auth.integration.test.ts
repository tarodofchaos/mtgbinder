import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock implementations
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_123'),
  compare: jest.fn(),
}));
import bcrypt from 'bcryptjs';

// Mock nanoid
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'TEST1234',
}));

// Mock Mailjet
jest.mock('node-mailjet', () => {
  return class {
    post() {
      return {
        request: jest.fn().mockResolvedValue({ body: {} }),
      };
    }
  };
});

// Mock config
jest.mock('../utils/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret-key',
    jwtExpiresIn: '1h',
    mailjet: {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      fromEmail: 'test@example.com',
      fromName: 'Test Name',
    },
  },
}));

// Mock prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// Import router after mocks
import { authRouter } from './auth';
import { errorHandler } from '../middleware/error-handler';

describe('Auth Routes - Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    const validRegistration = {
      email: 'newuser@example.com',
      password: 'securepass123',
      displayName: 'New User',
    };

    it('should register a new user successfully', async () => {
      mockFindUnique.mockResolvedValueOnce(null); // No existing user
      mockCreate.mockResolvedValueOnce({
        id: 'new-user-id',
        email: 'newuser@example.com',
        displayName: 'New User',
        shareCode: 'TEST1234',
        createdAt: new Date('2024-01-01'),
      });

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body.message).toBe('Registration successful');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.displayName).toBe('New User');
      expect(response.body.data.user.shareCode).toBe('TEST1234');
      expect(response.body.data.token).toBeDefined();

      // Verify password was hashed
      expect(bcrypt.hash).toHaveBeenCalledWith('securepass123', 12);

      // Verify prisma was called correctly
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          passwordHash: 'hashed_password_123',
          displayName: 'New User',
          shareCode: 'TEST1234',
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          shareCode: true,
          createdAt: true,
        },
      });
    });

    it('should reject registration with existing email', async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'newuser@example.com',
      });

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistration)
        .expect(400);

      expect(response.body.error).toBe('Email already registered');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'securepass123',
          displayName: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with password shorter than 8 characters', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          displayName: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with display name shorter than 2 characters', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'securepass123',
          displayName: 'X',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with display name longer than 50 characters', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'securepass123',
          displayName: 'A'.repeat(51),
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return a valid JWT token on successful registration', async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({
        id: 'jwt-test-user-id',
        email: 'jwt@example.com',
        displayName: 'JWT User',
        shareCode: 'TEST1234',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'jwt@example.com',
          password: 'securepass123',
          displayName: 'JWT User',
        })
        .expect(201);

      const token = response.body.data.token;
      const decoded = jwt.verify(token, 'test-jwt-secret-key') as { userId: string };

      expect(decoded.userId).toBe('jwt-test-user-id');
    });
  });

  describe('POST /auth/login', () => {
    const existingUser = {
      id: 'existing-user-id',
      email: 'existing@example.com',
      passwordHash: 'hashed_password',
      displayName: 'Existing User',
      shareCode: 'ABCD1234',
      createdAt: new Date('2024-01-01'),
    };

    it('should login successfully with correct credentials', async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'correctpassword',
        })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.email).toBe('existing@example.com');
      expect(response.body.data.user.displayName).toBe('Existing User');
      expect(response.body.data.token).toBeDefined();
      // Should not return password hash
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject login with incorrect password', async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login for non-existent user', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      // Should not reveal whether user exists
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'not-valid',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return a valid JWT token on successful login', async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'correctpassword',
        })
        .expect(200);

      const token = response.body.data.token;
      const decoded = jwt.verify(token, 'test-jwt-secret-key') as { userId: string };

      expect(decoded.userId).toBe('existing-user-id');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user when authenticated', async () => {
      // Generate a valid token
      const token = jwt.sign({ userId: 'auth-user-id' }, 'test-jwt-secret-key');

      // First call: auth middleware checks user exists
      mockFindUnique.mockResolvedValueOnce({ id: 'auth-user-id' });
      // Second call: route handler fetches full user
      mockFindUnique.mockResolvedValueOnce({
        id: 'auth-user-id',
        email: 'me@example.com',
        displayName: 'Me User',
        shareCode: 'MYCODE12',
        createdAt: new Date('2024-01-01'),
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.email).toBe('me@example.com');
      expect(response.body.data.displayName).toBe('Me User');
      expect(response.body.data.shareCode).toBe('MYCODE12');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject request with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 'user-id' },
        'test-jwt-secret-key',
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return 401 if user not found during auth middleware check', async () => {
      const token = jwt.sign({ userId: 'deleted-user-id' }, 'test-jwt-secret-key');
      // Auth middleware finds no user
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PUT /auth/me', () => {
    it('should update display name when authenticated', async () => {
      const token = jwt.sign({ userId: 'update-user-id' }, 'test-jwt-secret-key');

      // Auth middleware check
      mockFindUnique.mockResolvedValueOnce({ id: 'update-user-id' });
      // Update call
      mockUpdate.mockResolvedValueOnce({
        id: 'update-user-id',
        email: 'update@example.com',
        displayName: 'Updated Name',
        shareCode: 'UPDATE12',
        createdAt: new Date(),
      });

      const response = await request(app)
        .put('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Updated Name' })
        .expect(200);

      expect(response.body.data.displayName).toBe('Updated Name');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'update-user-id' },
        data: { displayName: 'Updated Name' },
        select: {
          id: true,
          email: true,
          displayName: true,
          shareCode: true,
          createdAt: true,
        },
      });
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put('/auth/me')
        .send({ displayName: 'New Name' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should handle forgot password request', async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: 'user-id',
        email: 'test@example.com',
      });
      mockUpdate.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.message).toContain('reset link has been sent');    
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id' },
          data: expect.objectContaining({
            resetToken: expect.any(String),
            resetTokenExpires: expect.any(Date),
          }),
        })
      );
    });

    it('should return same message even if user does not exist', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toContain('reset link has been sent');    
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: 'user-id',
        email: 'test@example.com',
      });
      mockUpdate.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ token: 'valid-token', password: 'new-secure-password' })      
        .expect(200);

      expect(response.body.message).toBe('Password has been reset successfully.');
      expect(bcrypt.hash).toHaveBeenCalledWith('new-secure-password', 12);    
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: {
          passwordHash: 'hashed_password_123',
          resetToken: null,
          resetTokenExpires: null,
        },
      });
    });

    it('should reject invalid or expired token', async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', password: 'new-secure-password' })    
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired reset token');     
    });
  });

  describe('Security Considerations', () => {
    it('should not expose password hash in any response', async () => {
      const userWithHash = {
        id: 'secure-user-id',
        email: 'secure@example.com',
        passwordHash: 'super_secret_hash_that_should_never_be_exposed',
        displayName: 'Secure User',
        shareCode: 'SECURE12',
        createdAt: new Date(),
      };

      // Test login response
      mockFindUnique.mockResolvedValueOnce(userWithHash);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'secure@example.com', password: 'password' })
        .expect(200);

      expect(JSON.stringify(loginResponse.body)).not.toContain('super_secret_hash');
      expect(loginResponse.body.data.user.passwordHash).toBeUndefined();
    });

    it('should use constant-time error message for failed logins', async () => {
      // Wrong email
      mockFindUnique.mockResolvedValueOnce(null);
      const wrongEmailResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'wrong@example.com', password: 'password' })
        .expect(401);

      // Wrong password
      mockFindUnique.mockResolvedValueOnce({
        id: 'id',
        email: 'right@example.com',
        passwordHash: 'hash',
        displayName: 'User',
        shareCode: 'CODE',
        createdAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      const wrongPasswordResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'right@example.com', password: 'wrongpass' })
        .expect(401);

      // Both should return same error message (prevents user enumeration)
      expect(wrongEmailResponse.body.error).toBe('Invalid credentials');
      expect(wrongPasswordResponse.body.error).toBe('Invalid credentials');
    });

    it('should hash passwords with appropriate cost factor (12 rounds)', async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({
        id: 'cost-test-id',
        email: 'cost@example.com',
        displayName: 'Cost User',
        shareCode: 'COST1234',
        createdAt: new Date(),
      });

      await request(app)
        .post('/auth/register')
        .send({
          email: 'cost@example.com',
          password: 'testpassword',
          displayName: 'Cost User',
        })
        .expect(201);

      // Verify bcrypt.hash was called with 12 rounds
      expect(bcrypt.hash).toHaveBeenCalledWith('testpassword', 12);
    });
  });
});
