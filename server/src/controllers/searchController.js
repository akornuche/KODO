const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Global search across products, users, orders, and bids
 * GET /api/search/global
 */
exports.globalSearch = async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 10,
      type = 'all', // 'all', 'products', 'users', 'orders', 'bids'
      sortBy = 'relevance',
    } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: true,
        message: 'Search query must be at least 2 characters',
        code: 'QUERY_TOO_SHORT',
        requestId: req.id,
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const searchTerm = q.trim();

    const results = {
      products: [],
      users: [],
      orders: [],
      bids: [],
    };

    const searchPromises = [];

    // Search products
    if (type === 'all' || type === 'products') {
      searchPromises.push(
        prisma.product.findMany({
          where: {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
              { category: { contains: searchTerm, mode: 'insensitive' } },
              { location: { contains: searchTerm, mode: 'insensitive' } },
              { tags: { hasSome: [searchTerm] } },
            ],
          },
          take: limitNum,
          include: {
            seller: {
              select: {
                id: true,
                username: true,
              },
            },
            _count: {
              select: { bids: true, orders: true },
            },
          },
        }).then(products => {
          results.products = products.map(product => ({
            id: product.id,
            type: 'product',
            title: product.title,
            description: product.description?.substring(0, 100) + (product.description?.length > 100 ? '...' : ''),
            price: product.price,
            category: product.category,
            seller: product.seller,
            image: product.images?.[0] || null,
            relevanceScore: calculateRelevanceScore(searchTerm, product.title, product.description, product.category),
            createdAt: product.createdAt,
          }));
        })
      );
    }

    // Search users
    if (type === 'all' || type === 'users') {
      searchPromises.push(
        prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          take: limitNum,
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            _count: {
              select: {
                products: true,
                orders: true,
                bids: true,
              },
            },
          },
        }).then(users => {
          results.users = users.map(user => ({
            id: user.id,
            type: 'user',
            title: user.username,
            subtitle: user.email,
            role: user.role,
            stats: user._count,
            relevanceScore: calculateRelevanceScore(searchTerm, user.username, user.email, `${user.firstName} ${user.lastName}`),
            createdAt: user.createdAt,
          }));
        })
      );
    }

    // Search orders (admin only for full details)
    if ((type === 'all' || type === 'orders') && req.user.role === 'admin') {
      searchPromises.push(
        prisma.order.findMany({
          where: {
            OR: [
              { id: { contains: searchTerm } }, // Order ID search
              {
                buyer: {
                  OR: [
                    { username: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              },
              {
                product: {
                  OR: [
                    { title: { contains: searchTerm, mode: 'insensitive' } },
                    {
                      seller: {
                        OR: [
                          { username: { contains: searchTerm, mode: 'insensitive' } },
                          { email: { contains: searchTerm, mode: 'insensitive' } },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
          take: limitNum,
          include: {
            buyer: {
              select: {
                id: true,
                username: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                seller: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        }).then(orders => {
          results.orders = orders.map(order => ({
            id: order.id,
            type: 'order',
            title: `Order ${order.id}`,
            subtitle: `${order.product.title} - ${order.buyer.username}`,
            status: order.status,
            totalAmount: order.totalAmount,
            buyer: order.buyer,
            product: order.product,
            relevanceScore: 1, // Simple scoring for orders
            createdAt: order.createdAt,
          }));
        })
      );
    }

    // Search bids (admin only)
    if ((type === 'all' || type === 'bids') && req.user.role === 'admin') {
      searchPromises.push(
        prisma.bid.findMany({
          where: {
            OR: [
              {
                buyer: {
                  OR: [
                    { username: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              },
              {
                product: {
                  title: { contains: searchTerm, mode: 'insensitive' },
                },
              },
              { message: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          take: limitNum,
          include: {
            buyer: {
              select: {
                id: true,
                username: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }).then(bids => {
          results.bids = bids.map(bid => ({
            id: bid.id,
            type: 'bid',
            title: `Bid on ${bid.product?.title || 'General Request'}`,
            subtitle: `${bid.buyer.username} - $${bid.amount}`,
            status: bid.status,
            amount: bid.amount,
            buyer: bid.buyer,
            product: bid.product,
            relevanceScore: 1,
            createdAt: bid.createdAt,
          }));
        })
      );
    }

    // Execute all searches in parallel
    await Promise.all(searchPromises);

    // Combine and sort results by relevance
    let allResults = [
      ...results.products,
      ...results.users,
      ...results.orders,
      ...results.bids,
    ];

    if (sortBy === 'relevance') {
      allResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    } else if (sortBy === 'newest') {
      allResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Apply pagination to combined results
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedResults = allResults.slice(startIndex, startIndex + limitNum);

    // Get counts for each type
    const counts = {
      products: results.products.length,
      users: results.users.length,
      orders: results.orders.length,
      bids: results.bids.length,
      total: allResults.length,
    };

    logger.info('Global search completed', {
      requestId: req.id,
      userId: req.user.id,
      query: searchTerm,
      type,
      resultsCount: paginatedResults.length,
      totalResults: allResults.length,
    });

    // Track search analytics
    await trackSearchAnalytics(searchTerm, req.user.id, type, paginatedResults.length);

    res.json({
      query: searchTerm,
      type,
      results: paginatedResults,
      counts,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: allResults.length,
        totalPages: Math.ceil(allResults.length / limitNum),
        hasMore: startIndex + paginatedResults.length < allResults.length,
      },
    });
  } catch (error) {
    logger.error('Global search error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Search failed',
      code: 'GLOBAL_SEARCH_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Calculate relevance score for search results
 * @param {string} query - Search query
 * @param {string} title - Title field
 * @param {string} description - Description field
 * @param {string} category - Category field
 * @returns {number} Relevance score
 */
function calculateRelevanceScore(query, title = '', description = '', category = '') {
  let score = 0;
  const queryLower = query.toLowerCase();

  // Title matches get highest score
  if (title && title.toLowerCase().includes(queryLower)) {
    score += 10;
    // Exact title match gets bonus
    if (title.toLowerCase().startsWith(queryLower)) {
      score += 5;
    }
  }

  // Description matches
  if (description && description.toLowerCase().includes(queryLower)) {
    score += 3;
  }

  // Category matches
  if (category && category.toLowerCase().includes(queryLower)) {
    score += 7;
  }

  return score;
}

/**
 * Get search suggestions
 * GET /api/search/suggestions
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q = '', limit = 5 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = [];

    // Get product title suggestions
    const productTitles = await prisma.product.findMany({
      where: {
        title: {
          contains: q,
          mode: 'insensitive',
        },
      },
      select: { title: true },
      distinct: ['title'],
      take: Math.ceil(limit / 3),
    });

    productTitles.forEach(p => {
      suggestions.push({
        text: p.title,
        type: 'product',
        category: 'Product Title',
      });
    });

    // Get category suggestions
    const categories = await prisma.product.findMany({
      where: {
        category: {
          contains: q,
          mode: 'insensitive',
        },
      },
      select: { category: true },
      distinct: ['category'],
      take: Math.ceil(limit / 3),
    });

    categories.forEach(c => {
      if (c.category) {
        suggestions.push({
          text: c.category,
          type: 'category',
          category: 'Category',
        });
      }
    });

    // Get user suggestions
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        username: true,
        firstName: true,
        lastName: true,
      },
      take: Math.ceil(limit / 3),
    });

    users.forEach(u => {
      const displayName = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username;
      suggestions.push({
        text: displayName,
        type: 'user',
        category: 'User',
      });
    });

    // Remove duplicates and limit
    const uniqueSuggestions = [];
    const seen = new Set();

    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.text) && uniqueSuggestions.length < limit) {
        uniqueSuggestions.push(suggestion);
        seen.add(suggestion.text);
      }
    }

    res.json({
      query: q,
      suggestions: uniqueSuggestions,
    });
  } catch (error) {
    logger.error('Get search suggestions error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to get suggestions',
      code: 'SUGGESTIONS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Save a search for later
 * POST /api/search/save
 */
exports.saveSearch = async (req, res) => {
  try {
    const { name, query, filters } = req.body;
    const userId = req.user.id;

    if (!name || !query) {
      return res.status(400).json({
        error: true,
        message: 'Name and query are required',
        code: 'INVALID_INPUT',
        requestId: req.id,
      });
    }

    // Store in user's notificationPreferences as a proxy (similar to favorites)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const savedSearches = user?.notificationPreferences?.savedSearches || [];

    // Check if search with same name exists
    const existingIndex = savedSearches.findIndex(s => s.name === name);
    if (existingIndex !== -1) {
      return res.status(400).json({
        error: true,
        message: 'A search with this name already exists',
        code: 'DUPLICATE_NAME',
        requestId: req.id,
      });
    }

    const newSearch = {
      id: `search_${Date.now()}`,
      name,
      query,
      filters: filters || {},
      createdAt: new Date().toISOString(),
    };

    savedSearches.push(newSearch);

    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: {
          ...user.notificationPreferences,
          savedSearches,
        },
      },
    });

    logger.info('Search saved', {
      requestId: req.id,
      userId,
      searchName: name,
    });

    res.status(201).json({
      message: 'Search saved successfully',
      search: newSearch,
    });
  } catch (error) {
    logger.error('Save search error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to save search',
      code: 'SAVE_SEARCH_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get user's saved searches
 * GET /api/search/saved
 */
exports.getSavedSearches = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const savedSearches = user?.notificationPreferences?.savedSearches || [];

    res.json({
      searches: savedSearches,
      count: savedSearches.length,
    });
  } catch (error) {
    logger.error('Get saved searches error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to get saved searches',
      code: 'GET_SAVED_SEARCHES_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Delete a saved search
 * DELETE /api/search/saved/:id
 */
exports.deleteSavedSearch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    let savedSearches = user?.notificationPreferences?.savedSearches || [];

    const searchIndex = savedSearches.findIndex(s => s.id === id);
    if (searchIndex === -1) {
      return res.status(404).json({
        error: true,
        message: 'Saved search not found',
        code: 'SEARCH_NOT_FOUND',
        requestId: req.id,
      });
    }

    savedSearches = savedSearches.filter(s => s.id !== id);

    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: {
          ...user.notificationPreferences,
          savedSearches,
        },
      },
    });

    logger.info('Saved search deleted', {
      requestId: req.id,
      userId,
      searchId: id,
    });

    res.json({
      message: 'Saved search deleted successfully',
    });
  } catch (error) {
    logger.error('Delete saved search error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to delete saved search',
      code: 'DELETE_SEARCH_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Track search analytics (called internally)
 * @param {string} query - Search query
 * @param {string} userId - User ID performing search
 * @param {string} type - Search type (global, products, etc.)
 * @param {number} resultCount - Number of results returned
 */
const trackSearchAnalytics = async (query, userId, type, resultCount) => {
  try {
    // In a production system, you'd store this in a database
    // For now, we'll just log it
    logger.info('Search analytics', {
      query,
      userId,
      type,
      resultCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail the search if analytics tracking fails
    logger.error('Search analytics tracking failed:', { error: error.message });
  }
};

module.exports = exports;