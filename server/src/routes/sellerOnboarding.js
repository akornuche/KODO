const express = require('express');
const router = express.Router();
const sellerOnboardingController = require('../controllers/sellerOnboardingController');
const { authenticateToken } = require('../../middleware/auth');

// Public route to get available niches
router.get('/niches', sellerOnboardingController.getNiches);

// Protected routes (require authentication)
router.use(authenticateToken);

// Get onboarding status
router.get('/status', sellerOnboardingController.getOnboardingStatus);

// Step 1: Update niche
router.put('/niche', sellerOnboardingController.updateNiche);

// Step 2: Update business info
router.put('/business', sellerOnboardingController.updateBusinessInfo);

// Step 3: Update payment info
router.put('/payment', sellerOnboardingController.updatePaymentInfo);

// Complete onboarding
router.post('/complete', sellerOnboardingController.completeOnboarding);

module.exports = router;
