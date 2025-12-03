const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Buyer Onboarding Controller
 * Handles 3-step onboarding process for buyers:
 * 1. Personal Info & Shopping Preferences
 * 2. Delivery Addresses (with landmarks & GPS)
 * 3. Payment Methods
 */

/**
 * Get buyer onboarding status
 * GET /api/buyer-onboarding/status
 */
exports.getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        buyerOnboarded: true,
        buyerOnboardingStep: true,
        shoppingInterests: true,
        addresses: {
          orderBy: { isDefault: 'desc' }
        },
        paymentMethods: {
          orderBy: { isDefault: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Define onboarding steps
    const steps = [
      {
        step: 1,
        title: 'Personal Information',
        description: 'Tell us about yourself',
        completed: !!(user.firstName && user.lastName && user.phoneNumber),
        fields: ['firstName', 'lastName', 'phoneNumber']
      },
      {
        step: 2,
        title: 'Delivery Addresses',
        description: 'Add your delivery locations',
        completed: user.addresses.length > 0,
        fields: ['addresses']
      },
      {
        step: 3,
        title: 'Payment Method',
        description: 'Setup your payment preference',
        completed: user.paymentMethods.length > 0,
        fields: ['paymentMethods']
      }
    ];

    // Calculate current step
    let currentStep = 1;
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].completed) {
        currentStep = i + 1;
        break;
      }
      if (i === steps.length - 1) {
        currentStep = 4; // All complete
      }
    }

    const isComplete = currentStep === 4;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        buyerOnboarded: user.buyerOnboarded,
        buyerOnboardingStep: user.buyerOnboardingStep,
        shoppingInterests: user.shoppingInterests ? JSON.parse(user.shoppingInterests) : [],
        addressCount: user.addresses.length,
        paymentMethodCount: user.paymentMethods.length
      },
      steps,
      currentStep: isComplete ? 4 : currentStep,
      isComplete
    });

  } catch (error) {
    logger.error('Get buyer onboarding status error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get onboarding status',
      code: 'STATUS_ERROR'
    });
  }
};

/**
 * Update personal info and shopping preferences (Step 1)
 * POST /api/buyer-onboarding/personal-info
 */
exports.updatePersonalInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phoneNumber, shoppingInterests } = req.body;

    // Validation
    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({
        error: true,
        message: 'First name, last name, and phone number are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate phone number format (Nigerian numbers)
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid Nigerian phone number format. Use +234XXXXXXXXXX or 0XXXXXXXXXX',
        code: 'INVALID_PHONE'
      });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phoneNumber,
        shoppingInterests: shoppingInterests ? JSON.stringify(shoppingInterests) : null,
        buyerOnboardingStep: Math.max(1, req.user.buyerOnboardingStep || 0)
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        shoppingInterests: true,
        buyerOnboardingStep: true
      }
    });

    logger.info(`Buyer ${userId} updated personal info (Step 1)`);

    res.json({
      message: 'Personal information updated successfully',
      user: {
        ...user,
        shoppingInterests: user.shoppingInterests ? JSON.parse(user.shoppingInterests) : []
      }
    });

  } catch (error) {
    logger.error('Update personal info error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update personal information',
      code: 'UPDATE_ERROR'
    });
  }
};

/**
 * Add delivery address (Step 2)
 * POST /api/buyer-onboarding/address
 */
exports.addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      addressType,
      label,
      fullName,
      phoneNumber,
      street,
      apartment,
      city,
      state,
      lga,
      postalCode,
      landmark,
      additionalDirections,
      isDefault,
      lat,
      lng
    } = req.body;

    // Validation
    if (!fullName || !phoneNumber || !street || !city || !state) {
      return res.status(400).json({
        error: true,
        message: 'Full name, phone number, street, city, and state are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate phone number
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE'
      });
    }

    // If this is the first address or explicitly set as default, make it default
    const existingAddresses = await prisma.address.count({
      where: { userId }
    });

    const shouldBeDefault = isDefault || existingAddresses === 0;

    // If setting as default, unset other defaults
    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Create address
    const address = await prisma.address.create({
      data: {
        userId,
        addressType: addressType || 'home',
        label,
        fullName,
        phoneNumber,
        street,
        apartment,
        city,
        state,
        lga,
        postalCode,
        landmark,
        additionalDirections,
        isDefault: shouldBeDefault,
        lat,
        lng
      }
    });

    // Update user onboarding step
    await prisma.user.update({
      where: { id: userId },
      data: {
        buyerOnboardingStep: Math.max(2, req.user.buyerOnboardingStep || 0)
      }
    });

    logger.info(`Buyer ${userId} added address (Step 2): ${address.id}`);

    res.status(201).json({
      message: 'Address added successfully',
      address
    });

  } catch (error) {
    logger.error('Add address error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to add address',
      code: 'ADD_ADDRESS_ERROR'
    });
  }
};

/**
 * Get all addresses for current user
 * GET /api/buyer-onboarding/addresses
 */
exports.getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      addresses,
      count: addresses.length
    });

  } catch (error) {
    logger.error('Get addresses error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get addresses',
      code: 'GET_ADDRESSES_ERROR'
    });
  }
};

/**
 * Update address
 * PUT /api/buyer-onboarding/address/:id
 */
exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const updateData = req.body;

    // Check address ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existingAddress) {
      return res.status(404).json({
        error: true,
        message: 'Address not found',
        code: 'ADDRESS_NOT_FOUND'
      });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false }
      });
    }

    // Update address
    const address = await prisma.address.update({
      where: { id: addressId },
      data: updateData
    });

    logger.info(`Buyer ${userId} updated address: ${addressId}`);

    res.json({
      message: 'Address updated successfully',
      address
    });

  } catch (error) {
    logger.error('Update address error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update address',
      code: 'UPDATE_ADDRESS_ERROR'
    });
  }
};

/**
 * Delete address
 * DELETE /api/buyer-onboarding/address/:id
 */
exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    // Check address ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existingAddress) {
      return res.status(404).json({
        error: true,
        message: 'Address not found',
        code: 'ADDRESS_NOT_FOUND'
      });
    }

    // Delete address
    await prisma.address.delete({
      where: { id: addressId }
    });

    // If deleted address was default, make another one default
    if (existingAddress.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      });

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true }
        });
      }
    }

    logger.info(`Buyer ${userId} deleted address: ${addressId}`);

    res.json({
      message: 'Address deleted successfully'
    });

  } catch (error) {
    logger.error('Delete address error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete address',
      code: 'DELETE_ADDRESS_ERROR'
    });
  }
};

/**
 * Add payment method (Step 3)
 * POST /api/buyer-onboarding/payment-method
 */
exports.addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      type,
      provider,
      last4,
      brand,
      expiryMonth,
      expiryYear,
      holderName,
      isDefault,
      stripePaymentMethodId,
      flutterwaveToken
    } = req.body;

    // Validation
    if (!type || !provider) {
      return res.status(400).json({
        error: true,
        message: 'Type and provider are required',
        code: 'MISSING_FIELDS'
      });
    }

    const validTypes = ['card', 'bank_account', 'wallet'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid payment method type',
        code: 'INVALID_TYPE'
      });
    }

    // Check if this is first payment method
    const existingMethods = await prisma.paymentMethod.count({
      where: { userId }
    });

    const shouldBeDefault = isDefault || existingMethods === 0;

    // If setting as default, unset other defaults
    if (shouldBeDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Create payment method
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId,
        type,
        provider,
        last4,
        brand,
        expiryMonth,
        expiryYear,
        holderName,
        isDefault: shouldBeDefault,
        stripePaymentMethodId,
        flutterwaveToken
      }
    });

    // Update user onboarding step
    await prisma.user.update({
      where: { id: userId },
      data: {
        buyerOnboardingStep: Math.max(3, req.user.buyerOnboardingStep || 0)
      }
    });

    logger.info(`Buyer ${userId} added payment method (Step 3): ${paymentMethod.id}`);

    res.status(201).json({
      message: 'Payment method added successfully',
      paymentMethod: {
        ...paymentMethod,
        // Mask sensitive data in response
        stripePaymentMethodId: paymentMethod.stripePaymentMethodId ? '***' : null,
        flutterwaveToken: paymentMethod.flutterwaveToken ? '***' : null
      }
    });

  } catch (error) {
    logger.error('Add payment method error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to add payment method',
      code: 'ADD_PAYMENT_ERROR'
    });
  }
};

/**
 * Complete buyer onboarding
 * POST /api/buyer-onboarding/complete
 */
exports.completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if all steps are complete
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        paymentMethods: true
      }
    });

    const missingSteps = [];

    if (!user.firstName || !user.lastName || !user.phoneNumber) {
      missingSteps.push('Personal information');
    }

    if (user.addresses.length === 0) {
      missingSteps.push('Delivery address');
    }

    if (user.paymentMethods.length === 0) {
      missingSteps.push('Payment method');
    }

    if (missingSteps.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Please complete all onboarding steps',
        code: 'INCOMPLETE_ONBOARDING',
        missingSteps
      });
    }

    // Mark onboarding as complete
    await prisma.user.update({
      where: { id: userId },
      data: {
        buyerOnboarded: true,
        buyerOnboardingStep: 3
      }
    });

    logger.info(`Buyer ${userId} completed onboarding`);

    res.json({
      message: 'Buyer onboarding completed successfully!',
      user: {
        id: user.id,
        buyerOnboarded: true
      }
    });

  } catch (error) {
    logger.error('Complete buyer onboarding error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to complete onboarding',
      code: 'COMPLETE_ERROR'
    });
  }
};

/**
 * Get shopping categories for interests selection
 * GET /api/buyer-onboarding/categories
 */
exports.getShoppingCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'Electronics', label: 'Electronics', icon: '📱' },
      { value: 'Fashion', label: 'Fashion & Apparel', icon: '👕' },
      { value: 'Home & Garden', label: 'Home & Garden', icon: '🏠' },
      { value: 'Sports & Outdoors', label: 'Sports & Outdoors', icon: '⚽' },
      { value: 'Books & Media', label: 'Books & Media', icon: '📚' },
      { value: 'Toys & Games', label: 'Toys & Games', icon: '🎮' },
      { value: 'Health & Beauty', label: 'Health & Beauty', icon: '💄' },
      { value: 'Automotive', label: 'Automotive', icon: '🚗' },
      { value: 'Food & Beverages', label: 'Food & Beverages', icon: '🍕' },
      { value: 'Jewelry & Accessories', label: 'Jewelry & Accessories', icon: '💍' },
      { value: 'Art & Collectibles', label: 'Art & Collectibles', icon: '🎨' },
      { value: 'Pet Supplies', label: 'Pet Supplies', icon: '🐶' },
      { value: 'Office Supplies', label: 'Office Supplies', icon: '📎' },
      { value: 'Baby & Kids', label: 'Baby & Kids', icon: '👶' },
      { value: 'Other', label: 'Other', icon: '📦' }
    ];

    res.json({ categories });

  } catch (error) {
    logger.error('Get shopping categories error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get categories',
      code: 'CATEGORIES_ERROR'
    });
  }
};

/**
 * Get Nigerian states and LGAs
 * GET /api/buyer-onboarding/locations
 */
exports.getNigerianLocations = async (req, res) => {
  try {
    // Sample Nigerian states with major LGAs
    const locations = [
      {
        state: 'Lagos State',
        lgas: ['Ikeja', 'Surulere', 'Yaba', 'Victoria Island', 'Lekki', 'Ikorodu', 'Epe', 'Badagry', 'Apapa', 'Lagos Island', 'Oshodi', 'Mushin', 'Agege', 'Alimosho', 'Kosofe', 'Ojo']
      },
      {
        state: 'Abuja FCT',
        lgas: ['Garki', 'Wuse', 'Maitama', 'Asokoro', 'Gwarinpa', 'Kubwa', 'Nyanya', 'Karu', 'Lugbe', 'Jabi', 'Utako']
      },
      {
        state: 'Kano State',
        lgas: ['Kano Municipal', 'Fagge', 'Dala', 'Gwale', 'Tarauni', 'Nassarawa', 'Ungogo', 'Kumbotso']
      },
      {
        state: 'Rivers State',
        lgas: ['Port Harcourt', 'Obio-Akpor', 'Eleme', 'Okrika', 'Oyigbo', 'Ikwerre', 'Etche']
      },
      {
        state: 'Oyo State',
        lgas: ['Ibadan North', 'Ibadan South', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ogbomoso North', 'Ogbomoso South', 'Oyo East', 'Oyo West']
      },
      {
        state: 'Kaduna State',
        lgas: ['Kaduna North', 'Kaduna South', 'Chikun', 'Igabi', 'Zaria', 'Sabon Gari', 'Giwa']
      }
    ];

    res.json({ locations });

  } catch (error) {
    logger.error('Get Nigerian locations error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get locations',
      code: 'LOCATIONS_ERROR'
    });
  }
};

module.exports = exports;
