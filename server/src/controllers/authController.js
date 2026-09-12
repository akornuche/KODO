const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sendEmail, templates } = require('../lib/email');
const { sendWelcomeEmail } = require('./notificationsController');
const logger = require('../lib/logger');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { 
      email, 
      username, 
      password, 
      role,
      firstName,
      lastName,
      businessName,
      sellerNiche,
      phoneNumber 
    } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: true,
        message: 'Email and password are required',
        code: 'MISSING_FIELDS',
      });
    }

    // If username not provided, generate from email
    const generatedUsername = username || email.split('@')[0] + '-' + Math.random().toString(36).substr(2, 5);

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        error: true,
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD',
      });
    }

    // Validate role if provided
    const validRoles = ['buyer', 'seller', 'courier', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid role. Must be one of: buyer, seller, courier, admin',
        code: 'INVALID_ROLE',
      });
    }

    // Seller-specific validation
    if (role === 'seller' && sellerNiche) {
      const validNiches = [
        'Electronics', 'Fashion', 'Home & Garden', 'Sports & Outdoors',
        'Books & Media', 'Toys & Games', 'Health & Beauty', 'Automotive',
        'Food & Beverages', 'Jewelry & Accessories', 'Art & Collectibles',
        'Pet Supplies', 'Office Supplies', 'Baby & Kids', 'Other'
      ];

      if (!validNiches.includes(sellerNiche)) {
        return res.status(400).json({
          error: true,
          message: `Invalid niche. Must be one of: ${validNiches.join(', ')}`,
          code: 'INVALID_NICHE',
        });
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: generatedUsername }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({
        error: true,
        message: `User with this ${field} already exists`,
        code: 'USER_EXISTS',
        details: { field }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username: generatedUsername,
        password: hashedPassword,
        ...(role && { role }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phoneNumber && { phoneNumber }),
        ...(role === 'seller' && {
          businessName: businessName || `${firstName || generatedUsername}'s Shop`,
          sellerNiche,
          sellerOnboarded: false,
          onboardingStep: 1, // Set to step 1 after registration
        }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        sellerNiche: true,
        businessName: true,
        sellerOnboarded: true,
        onboardingStep: true,
        createdAt: true,
      }
    });

    // Send welcome email (async, don't block response)
    sendWelcomeEmail(user).catch((error) => {
      logger.error('Failed to send welcome email:', {
        userId: user.id,
        error: error.message,
      });
    });

    // Generate a JWT so a newly registered user has an active session.
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error during registration',
      code: 'REGISTRATION_ERROR',
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Validation
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        error: true,
        message: 'Email/username and password are required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error during login',
      code: 'LOGIN_ERROR',
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        lastKnownLat: true,
        lastKnownLng: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error',
      code: 'PROFILE_ERROR',
    });
  }
};