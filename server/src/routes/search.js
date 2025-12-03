const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const searchController = require('../controllers/searchController');

const router = express.Router();

/**
 * Routes
 */

// Global search across all entities (authenticated users only)
router.get(
  '/global',
  authenticateToken,
  searchController.globalSearch
);

// Main search endpoint (alias for global search)
router.get(
  '/',
  authenticateToken,
  searchController.globalSearch
);

// Search suggestions (authenticated users only)
router.get(
  '/suggestions',
  authenticateToken,
  searchController.getSearchSuggestions
);

// Save a search
router.post(
  '/save',
  authenticateToken,
  searchController.saveSearch
);

// Get saved searches
router.get(
  '/saved',
  authenticateToken,
  searchController.getSavedSearches
);

// Delete a saved search
router.delete(
  '/saved/:id',
  authenticateToken,
  searchController.deleteSavedSearch
);

module.exports = router;