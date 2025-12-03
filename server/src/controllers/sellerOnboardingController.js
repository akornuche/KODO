const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Seller Onboarding Controller
 * Manages multi-step onboarding process for sellers
 */

// Predefined niches/categories that sellers can choose from
const SELLER_NICHES = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'Toys & Games',
  'Health & Beauty',
  'Automotive',
  'Food & Beverages',
  'Jewelry & Accessories',
  'Art & Collectibles',
  'Pet Supplies',
  'Office Supplies',
  'Baby & Kids',
  'Other'
];

// Subcategories mapped to niches
const NICHE_SUBCATEGORIES = {
  Electronics: ['Smartphones', 'Laptops', 'Tablets', 'Cameras', 'Audio', 'Gaming', 'Accessories'],
  Fashion: ['Mens Clothing', 'Womens Clothing', 'Shoes', 'Bags', 'Watches', 'Sunglasses'],
  'Home & Garden': ['Furniture', 'Decor', 'Kitchen', 'Bedding', 'Tools', 'Garden'],
  'Sports & Outdoors': ['Fitness', 'Camping', 'Cycling', 'Team Sports', 'Water Sports'],
  'Books & Media': ['Books', 'Magazines', 'Music', 'Movies', 'Video Games'],
  'Toys & Games': ['Action Figures', 'Board Games', 'Puzzles', 'Educational', 'Outdoor Toys'],
  'Health & Beauty': ['Skincare', 'Makeup', 'Haircare', 'Fragrances', 'Supplements'],
  Automotive: ['Car Parts', 'Accessories', 'Tools', 'Tires', 'Electronics'],
  'Food & Beverages': ['Snacks', 'Beverages', 'Gourmet', 'Organic', 'Specialty'],
  'Jewelry & Accessories': ['Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Watches'],
  'Art & Collectibles': ['Paintings', 'Sculptures', 'Antiques', 'Memorabilia', 'Crafts'],
  'Pet Supplies': ['Food', 'Toys', 'Grooming', 'Accessories', 'Health'],
  'Office Supplies': ['Stationery', 'Furniture', 'Electronics', 'Organization'],
  'Baby & Kids': ['Clothing', 'Toys', 'Furniture', 'Safety', 'Feeding'],
  Other: ['General']
};

/**
 * Get available niches
 */
exports.getNiches = async (req, res) => {
  try {
    res.json({
      niches: SELLER_NICHES.map(niche => ({
        value: niche,
        label: niche,
        subcategories: NICHE_SUBCATEGORIES[niche] || []
      }))
    });
  } catch (error) {
    logger.error('Get niches error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch niches',
    });
  }
};

/**
 * Get onboarding status
 */
exports.getOnboardingStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        role: true,
        sellerOnboarded: true,
        onboardingStep: true,
        sellerNiche: true,
        businessName: true,
        businessDescription: true,
        businessLogo: true,
        bankName: true,
        accountNumber: true,
        verified: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    if (user.role !== 'seller') {
      return res.status(403).json({
        error: true,
        message: 'Only sellers can access onboarding',
      });
    }

    // Define onboarding steps
    const steps = [
      {
        step: 1,
        title: 'Select Your Niche',
        description: 'Choose the primary category you want to sell in',
        completed: !!user.sellerNiche,
      },
      {
        step: 2,
        title: 'Business Information',
        description: 'Provide details about your business',
        completed: !!(user.businessName && user.businessDescription),
      },
      {
        step: 3,
        title: 'Payment Setup',
        description: 'Configure your payment method for receiving funds',
        completed: !!(user.bankName && user.accountNumber),
      },
      {
        step: 4,
        title: 'Verification',
        description: 'Verify your email and phone number',
        completed: user.verified,
      },
    ];

    res.json({
      user: {
        id: user.id,
        sellerOnboarded: user.sellerOnboarded,
        onboardingStep: user.onboardingStep,
        sellerNiche: user.sellerNiche,
      },
      steps,
      currentStep: user.onboardingStep,
      isComplete: user.sellerOnboarded,
    });
  } catch (error) {
    logger.error('Get onboarding status error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch onboarding status',
    });
  }
};

/**
 * Update niche selection (Step 1)
 */
exports.updateNiche = async (req, res) => {
  try {
    const { sellerNiche, subcategories } = req.body;

    if (!sellerNiche) {
      return res.status(400).json({
        error: true,
        message: 'Niche is required',
      });
    }

    if (!SELLER_NICHES.includes(sellerNiche)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid niche selected',
      });
    }

    // Validate subcategories
    if (subcategories && Array.isArray(subcategories)) {
      const validSubcategories = NICHE_SUBCATEGORIES[sellerNiche] || [];
      const invalidSubcategories = subcategories.filter(
        sub => !validSubcategories.includes(sub)
      );

      if (invalidSubcategories.length > 0) {
        return res.status(400).json({
          error: true,
          message: `Invalid subcategories: ${invalidSubcategories.join(', ')}`,
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        sellerNiche,
        sellerCategories: subcategories ? JSON.stringify(subcategories) : null,
        onboardingStep: Math.max(req.user.onboardingStep || 0, 2),
      },
      select: {
        id: true,
        sellerNiche: true,
        sellerCategories: true,
        onboardingStep: true,
      }
    });

    logger.info('Seller niche updated', { userId: user.id, niche: sellerNiche });

    res.json({
      message: 'Niche updated successfully',
      user: {
        ...user,
        sellerCategories: user.sellerCategories ? JSON.parse(user.sellerCategories) : [],
      },
    });
  } catch (error) {
    logger.error('Update niche error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update niche',
    });
  }
};

/**
 * Update business information (Step 2)
 */
exports.updateBusinessInfo = async (req, res) => {
  try {
    const { businessName, businessDescription, businessLogo } = req.body;

    if (!businessName) {
      return res.status(400).json({
        error: true,
        message: 'Business name is required',
      });
    }

    if (businessDescription && businessDescription.length < 20) {
      return res.status(400).json({
        error: true,
        message: 'Business description must be at least 20 characters',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        businessName,
        businessDescription,
        ...(businessLogo && { businessLogo }),
        onboardingStep: Math.max(req.user.onboardingStep || 0, 3),
      },
      select: {
        id: true,
        businessName: true,
        businessDescription: true,
        businessLogo: true,
        onboardingStep: true,
      }
    });

    logger.info('Business info updated', { userId: user.id });

    res.json({
      message: 'Business information updated successfully',
      user,
    });
  } catch (error) {
    logger.error('Update business info error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update business information',
    });
  }
};

/**
 * Update payment information (Step 3)
 */
exports.updatePaymentInfo = async (req, res) => {
  try {
    const { bankName, accountNumber, accountName, bankCode } = req.body;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({
        error: true,
        message: 'Bank name, account number, and account name are required',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        bankName,
        accountNumber,
        accountName,
        ...(bankCode && { bankCode }),
        onboardingStep: Math.max(req.user.onboardingStep || 0, 4),
      },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        onboardingStep: true,
      }
    });

    logger.info('Payment info updated', { userId: user.id });

    res.json({
      message: 'Payment information updated successfully',
      user: {
        id: user.id,
        bankName: user.bankName,
        accountNumber: `****${user.accountNumber.slice(-4)}`,
        accountName: user.accountName,
        onboardingStep: user.onboardingStep,
      },
    });
  } catch (error) {
    logger.error('Update payment info error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update payment information',
    });
  }
};

/**
 * Complete onboarding (Step 4)
 */
exports.completeOnboarding = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        sellerNiche: true,
        businessName: true,
        businessDescription: true,
        bankName: true,
        accountNumber: true,
        verified: true,
      }
    });

    // Validate all steps are completed
    const errors = [];
    if (!user.sellerNiche) errors.push('Niche not selected');
    if (!user.businessName) errors.push('Business name not provided');
    if (!user.businessDescription) errors.push('Business description not provided');
    if (!user.bankName || !user.accountNumber) errors.push('Payment information not provided');

    if (errors.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot complete onboarding',
        missingSteps: errors,
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        sellerOnboarded: true,
        onboardingStep: 4,
      },
      select: {
        id: true,
        sellerOnboarded: true,
        businessName: true,
        sellerNiche: true,
      }
    });

    logger.info('Seller onboarding completed', { userId: updatedUser.id });

    res.json({
      message: 'Onboarding completed successfully! You can now start selling.',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Complete onboarding error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to complete onboarding',
    });
  }
};

/**
 * Validate product category against seller's niche
 */
exports.validateProductCategory = async (req, res, next) => {
  try {
    if (req.user.role !== 'seller') {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        sellerNiche: true,
        sellerCategories: true,
        sellerOnboarded: true,
      }
    });

    if (!user.sellerOnboarded) {
      return res.status(403).json({
        error: true,
        message: 'Please complete seller onboarding before creating products',
        code: 'ONBOARDING_INCOMPLETE',
      });
    }

    const productCategory = req.body.category;
    if (!productCategory) {
      return next();
    }

    const allowedCategories = user.sellerCategories 
      ? JSON.parse(user.sellerCategories)
      : NICHE_SUBCATEGORIES[user.sellerNiche] || [];

    // Check if product category matches seller's niche or subcategories
    const isAllowed = 
      productCategory === user.sellerNiche ||
      allowedCategories.includes(productCategory);

    if (!isAllowed) {
      return res.status(403).json({
        error: true,
        message: `You can only sell products in your niche: ${user.sellerNiche}`,
        code: 'CATEGORY_NOT_ALLOWED',
        allowedCategories: [user.sellerNiche, ...allowedCategories],
      });
    }

    req.sellerNiche = user.sellerNiche;
    req.allowedCategories = allowedCategories;
    next();
  } catch (error) {
    logger.error('Validate product category error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to validate product category',
    });
  }
};

module.exports = exports;
