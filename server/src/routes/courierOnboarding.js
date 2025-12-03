const express = require('express');
const router = express.Router();
const courierOnboardingController = require('../controllers/courierOnboardingController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * Courier Onboarding Routes
 * All routes require authentication and courier role
 */

// Helper endpoints
router.get('/vehicle-types', authenticateToken, courierOnboardingController.getVehicleTypes);

// Onboarding status
router.get('/status', authenticateToken, courierOnboardingController.getOnboardingStatus);

// Step 1: Personal Info & Vehicle Details
router.post('/personal-info', authenticateToken, courierOnboardingController.updatePersonalInfo);

// Step 2: Service Areas & Routes
router.get('/service-areas', authenticateToken, courierOnboardingController.getServiceAreas);
router.post('/service-area', authenticateToken, courierOnboardingController.addServiceArea);
router.get('/routes', authenticateToken, courierOnboardingController.getRoutes);
router.post('/route', authenticateToken, courierOnboardingController.addRoute);

// Step 3: Documents & Verification
router.get('/documents', authenticateToken, courierOnboardingController.getDocuments);
router.post('/document', authenticateToken, courierOnboardingController.uploadDocument);
router.post('/guarantor', authenticateToken, courierOnboardingController.addGuarantor);

// Step 4: Operating Hours & Preferences
router.post('/availability', authenticateToken, courierOnboardingController.setAvailability);
router.post('/preferences', authenticateToken, courierOnboardingController.setPreferences);

// Complete onboarding
router.post('/complete', authenticateToken, courierOnboardingController.completeOnboarding);

module.exports = router;
