const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticateToken } = require('../../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get user's favorites
router.get('/', favoritesController.getFavorites);

// Check if product is favorited
router.get('/:productId/check', favoritesController.checkFavorite);

// Add product to favorites
router.post('/:productId', favoritesController.addFavorite);

// Remove product from favorites
router.delete('/:productId', favoritesController.removeFavorite);

module.exports = router;
