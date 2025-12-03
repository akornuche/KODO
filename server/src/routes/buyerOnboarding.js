const express = require('express');
const router = express.Router();
const buyerOnboardingController = require('../controllers/buyerOnboardingController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * Buyer Onboarding Routes
 * All routes require authentication
 */

// Get categories and locations (helper endpoints)
router.get('/categories', authenticateToken, buyerOnboardingController.getShoppingCategories);
router.get('/locations', authenticateToken, buyerOnboardingController.getNigerianLocations);

// Onboarding status
router.get('/status', authenticateToken, buyerOnboardingController.getOnboardingStatus);

// Step 1: Personal Info & Preferences
router.post('/personal-info', authenticateToken, buyerOnboardingController.updatePersonalInfo);

// Step 2: Delivery Addresses
router.get('/addresses', authenticateToken, buyerOnboardingController.getAddresses);
router.post('/address', authenticateToken, buyerOnboardingController.addAddress);
router.put('/address/:id', authenticateToken, buyerOnboardingController.updateAddress);
router.delete('/address/:id', authenticateToken, buyerOnboardingController.deleteAddress);

// Step 3: Payment Methods
router.post('/payment-method', authenticateToken, buyerOnboardingController.addPaymentMethod);

// Complete onboarding
router.post('/complete', authenticateToken, buyerOnboardingController.completeOnboarding);

module.exports = router;
