const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * Security utilities for the KODO platform
 * Provides encryption, hashing, JWT handling, and security validations
 */
class SecurityManager {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production';
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    this.algorithm = 'aes-256-gcm';
    this.saltRounds = 12;
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Invalid password provided');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hashedPassword) {
    try {
      if (!password || !hashedPassword) {
        return false;
      }

      const isValid = await bcrypt.compare(password, hashedPassword);
      logger.debug('Password verification completed', { valid: isValid });
      return isValid;
    } catch (error) {
      logger.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Expiration time (default: 15 minutes)
   * @returns {string} JWT token
   */
  generateAccessToken(payload, expiresIn = '15m') {
    try {
      const tokenPayload = {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      };

      const token = jwt.sign(tokenPayload, this.jwtSecret, { expiresIn });
      logger.debug('Access token generated', { userId: payload.id, expiresIn });
      return token;
    } catch (error) {
      logger.error('Access token generation error:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Expiration time (default: 7 days)
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload, expiresIn = '7d') {
    try {
      const tokenPayload = {
        ...payload,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      };

      const token = jwt.sign(tokenPayload, this.jwtRefreshSecret, { expiresIn });
      logger.debug('Refresh token generated', { userId: payload.id, expiresIn });
      return token;
    } catch (error) {
      logger.error('Refresh token generation error:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @param {string} type - Token type ('access' or 'refresh')
   * @returns {Object|null} Decoded payload or null if invalid
   */
  verifyToken(token, type = 'access') {
    try {
      const secret = type === 'refresh' ? this.jwtRefreshSecret : this.jwtSecret;
      const decoded = jwt.verify(token, secret);

      if (decoded.type !== type) {
        logger.warn('Token type mismatch', { expected: type, received: decoded.type });
        return null;
      }

      logger.debug('Token verified successfully', { userId: decoded.id, type });
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.debug('Token expired', { type });
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid token', { type, error: error.message });
      } else {
        logger.error('Token verification error:', error);
      }
      return null;
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Plain text to encrypt
   * @returns {string} Encrypted data with IV and auth tag
   */
  encrypt(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text provided for encryption');
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine IV, encrypted data, and auth tag
      const result = iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');

      logger.debug('Data encrypted successfully');
      return result;
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedText - Encrypted data with IV and auth tag
   * @returns {string} Decrypted plain text
   */
  decrypt(encryptedText) {
    try {
      if (!encryptedText || typeof encryptedText !== 'string') {
        throw new Error('Invalid encrypted text provided');
      }

      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Data decrypted successfully');
      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate secure random string
   * @param {number} length - Length of the string
   * @returns {string} Random string
   */
  generateSecureToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Secure token generation error:', error);
      throw new Error('Failed to generate secure token');
    }
  }

  /**
   * Generate API key
   * @param {string} prefix - Prefix for the API key
   * @returns {string} API key
   */
  generateApiKey(prefix = 'kodo') {
    const timestamp = Date.now().toString(36);
    const random = this.generateSecureToken(16);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Hash sensitive data (for logging, not passwords)
   * @param {string} data - Data to hash
   * @returns {string} SHA-256 hash
   */
  hashData(data) {
    try {
      if (!data) return '';
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      logger.error('Data hashing error:', error);
      return '';
    }
  }

  /**
   * Sanitize input data to prevent injection attacks
   * @param {string} input - Input string
   * @returns {string} Sanitized string
   */
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
      return input;
    }

    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Validate email format and security
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Additional security checks
    const sanitized = this.sanitizeInput(email);
    if (sanitized !== email) {
      return false; // Email contained suspicious characters
    }

    if (email.length > 254) {
      return false; // RFC 5321 limit
    }

    return true;
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with score and requirements
   */
  validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, score: 0, requirements: [] };
    }

    const requirements = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 1;
      requirements.push('length');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
      requirements.push('lowercase');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
      requirements.push('uppercase');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
      requirements.push('number');
    }

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1;
      requirements.push('special');
    }

    // No common patterns
    if (!/(123456|password|qwerty|abc123)/i.test(password)) {
      score += 1;
      requirements.push('noCommon');
    }

    return {
      valid: score >= 4, // Require at least 4 criteria
      score,
      maxScore: 6,
      requirements,
      strength: score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak'
    };
  }

  /**
   * Generate CSRF token
   * @returns {string} CSRF token
   */
  generateCsrfToken() {
    return this.generateSecureToken(32);
  }

  /**
   * Validate CSRF token
   * @param {string} token - Token to validate
   * @param {string} sessionToken - Session token to compare against
   * @returns {boolean} True if valid
   */
  validateCsrfToken(token, sessionToken) {
    if (!token || !sessionToken) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(sessionToken, 'hex')
      );
    } catch (error) {
      logger.error('CSRF token validation error:', error);
      return false;
    }
  }

  /**
   * Rate limiting helper for security events
   * @param {string} identifier - User/session identifier
   * @param {string} action - Action being performed
   * @param {number} maxAttempts - Maximum attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} True if within limits
   */
  checkRateLimit(identifier, action, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    // This would typically use Redis for distributed rate limiting
    // For now, return true (implement with Redis in production)
    logger.debug('Rate limit check', { identifier, action, maxAttempts, windowMs });
    return true;
  }

  /**
   * Log security event
   * @param {string} event - Event type
   * @param {Object} details - Event details
   */
  logSecurityEvent(event, details = {}) {
    logger.warn(`Security Event: ${event}`, {
      timestamp: new Date().toISOString(),
      ...details,
      hashedData: details.sensitive ? this.hashData(details.sensitive) : undefined
    });
  }

  /**
   * Check if IP is suspicious
   * @param {string} ip - IP address
   * @returns {boolean} True if suspicious
   */
  isSuspiciousIp(ip) {
    if (!ip) return false;

    // Basic checks - in production, use services like MaxMind
    const suspiciousPatterns = [
      /^127\./,  // localhost
      /^10\./,   // private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // private network
      /^192\.168\./,  // private network
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ip));
  }

  /**
   * Generate secure headers for responses
   * @returns {Object} Security headers
   */
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    };
  }
}

module.exports = new SecurityManager();