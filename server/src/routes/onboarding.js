const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const prisma = require('../lib/prisma');

/**
 * General Onboarding Routes
 * Centralized endpoint to check user onboarding status
 */

// Get overall onboarding status based on user role
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user with onboarding status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        buyerOnboarded: true,
        sellerOnboarded: true,
        courierOnboarded: true,
        verified: true,
        onboardingStep: true,
        buyerOnboardingStep: true,
        courierOnboardingStep: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine if onboarding is complete based on role
    let onboarded = false;
    let redirectTo = null;

    switch (user.role) {
      case 'buyer':
        onboarded = user.buyerOnboarded || false;
        if (!onboarded) {
          redirectTo = '/onboarding/buyer';
        }
        break;
      
      case 'seller':
        onboarded = user.sellerOnboarded || false;
        if (!onboarded) {
          redirectTo = '/onboarding/seller';
        }
        break;
      
      case 'courier':
        onboarded = user.courierOnboarded || false;
        if (!onboarded) {
          redirectTo = '/onboarding/courier';
        }
        break;
      
      case 'admin':
        // Admins don't need onboarding
        onboarded = true;
        break;
      
      default:
        onboarded = false;
    }

    res.json({
      onboarded,
      role: user.role,
      redirectTo,
      details: {
        buyerOnboarded: user.buyerOnboarded,
        sellerOnboarded: user.sellerOnboarded,
        courierOnboarded: user.courierOnboarded,
        verified: user.verified,
        onboardingStep: user.onboardingStep,
        buyerOnboardingStep: user.buyerOnboardingStep,
        courierOnboardingStep: user.courierOnboardingStep,
      }
    });

  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding status' });
  }
});

// Complete onboarding for any role (used by onboarding completion flows)
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    let updateData = {};
    
    switch (role) {
      case 'buyer':
        updateData.buyerOnboarded = true;
        updateData.buyerOnboardingStep = 4; // Complete
        break;
      
      case 'seller':
        updateData.sellerOnboarded = true;
        updateData.onboardingStep = 4; // Complete
        break;
      
      case 'courier':
        updateData.courierOnboarded = true;
        updateData.courierOnboardingStep = 4; // Complete
        updateData.courierVerificationStatus = 'basic'; // Basic verification for completed onboarding
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        role: true,
        buyerOnboarded: true,
        sellerOnboarded: true,
        courierOnboarded: true,
      },
    });

    res.json({
      success: true,
      message: `${role} onboarding completed successfully`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

module.exports = router;