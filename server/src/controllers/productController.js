const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const path = require('path');
const { processImage, generateThumbnail, deleteImages, getPublicUrl, getFilePathFromUrl } = require('../lib/upload');
const kodoCache = require('../lib/kodoCache');

/**
 * Get all products with pagination, search, and filters
 * GET /api/products?page=1&limit=20&search=&sellerId=&category=&minPrice=&maxPrice=&condition=&tags=
 */
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      sellerId = '',
      category = '',
      minPrice = '',
      maxPrice = '',
      condition = '',
      tags = '',
      location = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Create cache key from query parameters
    const cacheFilters = {
      page, limit, search, sellerId, category, minPrice, maxPrice,
      condition, tags, location, sortBy, sortOrder
    };

    // Try to get from cache first
    const cachedResult = await kodoCache.getProductsList(cacheFilters);
    if (cachedResult) {
      logger.debug('Products list cache hit');
      return res.json(cachedResult);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    // Text search
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filters
    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (condition) {
      where.condition = condition;
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        where.price.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice);
      }
    }

    // Tags filter (products that have at least one of the specified tags)
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      where.tags = {
        hasSome: tagArray,
      };
    }

    // Validate sort field
    const validSortFields = ['createdAt', 'updatedAt', 'price', 'title'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Get products with seller info
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [orderByField]: sortOrder },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              url: true,
              thumbnailUrl: true,
              alt: true,
              caption: true,
              width: true,
              height: true,
              format: true,
            },
          },
          _count: {
            select: { bids: true, orders: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Get facets for filtering (counts by category, condition, etc.)
    const facets = await Promise.all([
      // Category counts
      prisma.product.groupBy({
        by: ['category'],
        where: { category: { not: null } },
        _count: true,
      }),
      // Condition counts
      prisma.product.groupBy({
        by: ['condition'],
        _count: true,
      }),
    ]);

    logger.info(`Retrieved ${products.length} products`, {
      requestId: req.id,
      page: pageNum,
      total,
      filters: { search, category, minPrice, maxPrice, condition, tags, location },
    });

    const result = {
      items: products,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + products.length < total,
      },
      facets: {
        categories: facets[0].map((f) => ({ category: f.category, count: f._count })),
        conditions: facets[1].map((f) => ({ condition: f.condition, count: f._count })),
      },
    };

    // Cache the result
    await kodoCache.setProductsList(cacheFilters, result);

    res.json(result);
  } catch (error) {
    logger.error('Get products error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve products',
      code: 'PRODUCTS_FETCH_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get single product by ID
 * GET /api/products/:id
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get from cache first
    const cachedProduct = await kodoCache.getProduct(id);
    if (cachedProduct) {
      logger.debug(`Product cache hit for ${id}`);
      return res.json({ product: cachedProduct });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            alt: true,
            caption: true,
            width: true,
            height: true,
            format: true,
          },
        },
        bids: {
          where: { status: 'open' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            buyer: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: { bids: true, orders: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        requestId: req.id,
      });
    }

    logger.info(`Retrieved product ${id}`, { requestId: req.id });

    // Cache the product data
    await kodoCache.setProduct(id, product);

    res.json({ product });
  } catch (error) {
    logger.error('Get product by ID error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve product',
      code: 'PRODUCT_FETCH_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Create new product (seller only)
 * POST /api/products
 */
exports.createProduct = async (req, res) => {
  try {
    const { title, description, price, category, tags, condition, location } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user has permission to create products
    if (userRole !== 'seller' && userRole !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'Only sellers can create products',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Validation
    if (!title || !price) {
      return res.status(400).json({
        error: true,
        message: 'Title and price are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Price must be a positive number',
        code: 'INVALID_PRICE',
        requestId: req.id,
      });
    }

    // Validate condition if provided
    const validConditions = ['new', 'like_new', 'good', 'fair', 'poor'];
    if (condition && !validConditions.includes(condition)) {
      return res.status(400).json({
        error: true,
        message: `Invalid condition. Must be one of: ${validConditions.join(', ')}`,
        code: 'INVALID_CONDITION',
        requestId: req.id,
      });
    }

    // Build product data
    const productData = {
      title,
      description: description || null,
      price,
      sellerId: userId,
    };

    if (category) productData.category = category;
    if (tags && Array.isArray(tags)) productData.tags = tags;
    if (condition) productData.condition = condition;
    if (location) productData.location = location;

    // Create product
    const product = await prisma.product.create({
      data: productData,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Product created: ${product.id}`, {
      requestId: req.id,
      userId,
      productId: product.id,
    });

    // Invalidate relevant caches
    await kodoCache.invalidateProductsList();

    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    logger.error('Create product error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to create product',
      code: 'PRODUCT_CREATE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update product (owner only)
 * PUT /api/products/:id
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, category, tags, condition, location } = req.body;
    const userId = req.user.id;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check ownership
    if (existingProduct.sellerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'You can only update your own products',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Validate price if provided
    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      return res.status(400).json({
        error: true,
        message: 'Price must be a positive number',
        code: 'INVALID_PRICE',
        requestId: req.id,
      });
    }

    // Validate condition if provided
    const validConditions = ['new', 'like_new', 'good', 'fair', 'poor'];
    if (condition && !validConditions.includes(condition)) {
      return res.status(400).json({
        error: true,
        message: `Invalid condition. Must be one of: ${validConditions.join(', ')}`,
        code: 'INVALID_CONDITION',
        requestId: req.id,
      });
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined && Array.isArray(tags)) updateData.tags = tags;
    if (condition !== undefined) updateData.condition = condition;
    if (location !== undefined) updateData.location = location;

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Product updated: ${id}`, {
      requestId: req.id,
      userId,
      productId: id,
    });

    // Invalidate caches
    await kodoCache.invalidateProduct(id);
    await kodoCache.invalidateProductsList();

    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    logger.error('Update product error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update product',
      code: 'PRODUCT_UPDATE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Delete product (owner only)
 * DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check ownership
    if (existingProduct.sellerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'You can only delete your own products',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Prevent deletion if product has orders
    if (existingProduct._count.orders > 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete product with existing orders',
        code: 'PRODUCT_HAS_ORDERS',
        details: { orderCount: existingProduct._count.orders },
        requestId: req.id,
      });
    }

    // Delete product images first
    const productImages = await prisma.productImage.findMany({
      where: { productId: id },
      select: { publicId: true },
    });

    if (productImages.length > 0) {
      try {
        const publicIds = productImages.map(img => img.publicId);
        await deleteImages(publicIds);
      } catch (imageError) {
        logger.error('Failed to delete product images:', {
          requestId: req.id,
          productId: id,
          error: imageError.message,
        });
        // Continue with deletion even if images fail
      }
    }

    // Delete product
    await prisma.product.delete({
      where: { id },
    });

    logger.info(`Product deleted: ${id}`, {
      requestId: req.id,
      userId,
      productId: id,
    });

    // Invalidate caches
    await kodoCache.invalidateProduct(id);
    await kodoCache.invalidateProductsList();

    res.json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    logger.error('Delete product error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to delete product',
      code: 'PRODUCT_DELETE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Upload images for a product (owner only)
 * POST /api/products/:id/images
 * @deprecated Use /api/upload/products/:id/images instead
 */
exports.uploadProductImages = async (req, res) => {
  return res.status(410).json({
    error: true,
    message: 'This endpoint has been moved to /api/upload/products/:id/images',
    code: 'ENDPOINT_MOVED',
    requestId: req.id,
  });
};

/**
 * Delete a specific image from a product (owner only)
 * DELETE /api/products/:id/images/:imageIndex
 * @deprecated Use /api/upload/products/:id/images/:imageId instead
 */
exports.deleteProductImage = async (req, res) => {
  return res.status(410).json({
    error: true,
    message: 'This endpoint has been moved to /api/upload/products/:id/images/:imageId',
    code: 'ENDPOINT_MOVED',
    requestId: req.id,
  });
};

/**
 * Advanced search with full-text capabilities and enhanced filtering
 * GET /api/products/search
 */
exports.searchProducts = async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 20,
      category = '',
      minPrice = '',
      maxPrice = '',
      condition = '',
      tags = '',
      location = '',
      sellerId = '',
      brand = '',
      brands = '',
      minRating = '',
      inStock = '',
      isDigital = '',
      sortBy = 'relevance',
      dateFrom = '',
      dateTo = '',
      latitude = '',
      longitude = '',
      radius = '', // radius in km for location-based search
    } = req.query;

    // Create cache key from search parameters
    const searchFilters = {
      q, page, limit, category, minPrice, maxPrice, condition, tags,
      location, sellerId, sortBy, dateFrom, dateTo, latitude, longitude, radius
    };

    // Try to get from cache first
    const cachedResult = await kodoCache.getSearchResults(q, searchFilters);
    if (cachedResult) {
      logger.debug(`Search cache hit for "${q}"`);
      return res.json(cachedResult);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (!q && !category && !sellerId && !location && !tags) {
      return res.status(400).json({
        error: true,
        message: 'At least one search parameter is required (q, category, sellerId, location, or tags)',
        code: 'MISSING_SEARCH_PARAMS',
        requestId: req.id,
      });
    }

    const searchTerms = q ? q.trim().split(/\s+/) : [];

    // Build where clause for search
    const where = {
      AND: [],
    };

    // Full-text search across multiple fields
    if (searchTerms.length > 0) {
      const searchConditions = [];

      // Search in title, description, category, location, and tags
      searchConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          {
            tags: {
              hasSome: searchTerms,
            },
          },
        ],
      });

      where.AND.push(...searchConditions);
    }

    // Apply additional filters
    const additionalFilters = [];

    if (category) {
      additionalFilters.push({ category: { equals: category, mode: 'insensitive' } });
    }

    if (condition) {
      additionalFilters.push({ condition });
    }

    if (sellerId) {
      additionalFilters.push({ sellerId });
    }

    if (location && !latitude && !longitude) {
      // Text-based location search
      additionalFilters.push({ location: { contains: location, mode: 'insensitive' } });
    }

    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice);
      additionalFilters.push({ price: priceFilter });
    }

    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      additionalFilters.push({ tags: { hasSome: tagArray } });
    }

    // Brand filtering (single or multiple)
    if (brand) {
      additionalFilters.push({ brand: { equals: brand, mode: 'insensitive' } });
    } else if (brands) {
      const brandArray = brands.split(',').map((b) => b.trim());
      additionalFilters.push({
        brand: {
          in: brandArray,
        },
      });
    }

    // Rating filtering
    if (minRating) {
      additionalFilters.push({
        averageRating: { gte: parseFloat(minRating) },
      });
    }

    // Stock filtering
    if (inStock === 'true') {
      additionalFilters.push({
        OR: [
          { stockQuantity: { gt: 0 } },
          { stockQuantity: null }, // Products without stock tracking
        ],
      });
    }

    // Digital/Physical filtering
    if (isDigital === 'true') {
      additionalFilters.push({ isDigital: true });
    } else if (isDigital === 'false') {
      additionalFilters.push({ isDigital: false });
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      additionalFilters.push({ createdAt: dateFilter });
    }

    // Location-based search with radius (if coordinates provided)
    if (latitude && longitude && radius) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const rad = parseFloat(radius);

      // Note: This is a simplified distance calculation
      // In production, you'd want to use PostGIS or similar for accurate geo queries
      // For now, we'll do a bounding box approximation
      const latDelta = (rad / 111.32); // Approximate km per degree latitude
      const lngDelta = (rad / (111.32 * Math.cos(lat * Math.PI / 180))); // Adjust for longitude

      additionalFilters.push({
        AND: [
          { latitude: { gte: lat - latDelta, lte: lat + latDelta } },
          { longitude: { gte: lng - lngDelta, lte: lng + lngDelta } },
        ],
      });
    }

    if (additionalFilters.length > 0) {
      where.AND.push(...additionalFilters);
    }

    // Determine sort order
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sortBy === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (sortBy === 'rating_desc') {
      orderBy = { averageRating: 'desc' };
    } else if (sortBy === 'rating_asc') {
      orderBy = { averageRating: 'asc' };
    } else if (sortBy === 'popular') {
      orderBy = { reviewCount: 'desc' };
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sortBy === 'relevance' && searchTerms.length > 0) {
      // For relevance sorting, we'll use a combination of factors
      // This is simplified - in production you'd use full-text search ranking
      orderBy = [
        { updatedAt: 'desc' }, // Recently updated first
        { createdAt: 'desc' }, // Then by creation date
      ];
    }

    // Execute search
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              email: true,
              createdAt: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
            take: 1, // Just get the first image for search results
            select: {
              id: true,
              url: true,
              thumbnailUrl: true,
              alt: true,
              width: true,
              height: true,
              format: true,
            },
          },
          _count: {
            select: { bids: true, orders: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate relevance scores for search results (simplified)
    const productsWithScores = products.map((product) => {
      let relevanceScore = 0;

      if (searchTerms.length > 0) {
        const searchableText = `${product.title} ${product.description} ${product.category} ${product.location}`.toLowerCase();
        const tagMatches = product.tags ? product.tags.filter(tag =>
          searchTerms.some(term => tag.toLowerCase().includes(term.toLowerCase()))
        ).length : 0;

        // Title matches get highest score
        if (product.title.toLowerCase().includes(q.toLowerCase())) {
          relevanceScore += 10;
        }

        // Description matches
        if (product.description && product.description.toLowerCase().includes(q.toLowerCase())) {
          relevanceScore += 5;
        }

        // Category matches
        if (product.category && product.category.toLowerCase().includes(q.toLowerCase())) {
          relevanceScore += 7;
        }

        // Tag matches
        relevanceScore += tagMatches * 3;

        // Location matches
        if (product.location && product.location.toLowerCase().includes(q.toLowerCase())) {
          relevanceScore += 4;
        }

        // Recent activity bonus
        const daysSinceUpdate = (Date.now() - new Date(product.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) relevanceScore += 2;
        else if (daysSinceUpdate < 30) relevanceScore += 1;
      }

      return {
        ...product,
        relevanceScore: searchTerms.length > 0 ? relevanceScore : null,
      };
    });

    // Re-sort by relevance if relevance sorting was requested
    if (sortBy === 'relevance' && searchTerms.length > 0) {
      productsWithScores.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    // Get search suggestions (popular search terms)
    const suggestions = await getSearchSuggestions(q, 5);

    logger.info(`Enhanced search completed: "${q}"`, {
      requestId: req.id,
      query: q,
      resultsCount: productsWithScores.length,
      total,
      filters: {
        category,
        minPrice,
        maxPrice,
        condition,
        tags,
        location,
        sellerId,
        dateFrom,
        dateTo,
        latitude,
        longitude,
        radius,
      },
    });

    const result = {
      query: q,
      items: productsWithScores,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + productsWithScores.length < total,
      },
      suggestions,
      appliedFilters: {
        category: category || null,
        priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
        condition: condition || null,
        tags: tags ? tags.split(',').map(t => t.trim()) : null,
        location: location || null,
        sellerId: sellerId || null,
        dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
        geoLocation: latitude && longitude ? { lat: latitude, lng: longitude, radius } : null,
      },
    };

    // Cache the search result
    await kodoCache.setSearchResults(q, searchFilters, result);

    res.json(result);
  } catch (error) {
    logger.error('Enhanced search products error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Search failed',
      code: 'SEARCH_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get search suggestions based on popular searches and existing data
 * @param {string} query - Current search query
 * @param {number} limit - Maximum number of suggestions
 * @returns {Array} Array of suggestion objects
 */
const getSearchSuggestions = async (query, limit = 5) => {
  try {
    const suggestions = [];

    if (!query || query.length < 2) {
      // Return popular categories if no query
      const popularCategories = await prisma.product.groupBy({
        by: ['category'],
        where: {
          category: { not: null },
        },
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: limit,
      });

      return popularCategories.map(cat => ({
        text: cat.category,
        type: 'category',
        count: cat._count,
      }));
    }

    // Get matching categories
    const matchingCategories = await prisma.product.findMany({
      where: {
        category: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: { category: true },
      distinct: ['category'],
      take: Math.ceil(limit / 3),
    });

    matchingCategories.forEach(cat => {
      if (cat.category) {
        suggestions.push({
          text: cat.category,
          type: 'category',
        });
      }
    });

    // Get matching product titles
    const matchingTitles = await prisma.product.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: { title: true },
      distinct: ['title'],
      take: Math.ceil(limit / 3),
    });

    matchingTitles.forEach(prod => {
      suggestions.push({
        text: prod.title,
        type: 'product',
      });
    });

    // Get matching tags
    const matchingTags = await prisma.product.findMany({
      where: {
        tags: {
          hasSome: [query],
        },
      },
      select: { tags: true },
      take: Math.ceil(limit / 3),
    });

    const uniqueTags = new Set();
    matchingTags.forEach(prod => {
      if (prod.tags) {
        prod.tags.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase()) && !uniqueTags.has(tag)) {
            uniqueTags.add(tag);
            suggestions.push({
              text: tag,
              type: 'tag',
            });
          }
        });
      }
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = [];
    const seen = new Set();

    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.text) && uniqueSuggestions.length < limit) {
        uniqueSuggestions.push(suggestion);
        seen.add(suggestion.text);
      }
    }

    return uniqueSuggestions;
  } catch (error) {
    logger.error('Get search suggestions error:', { error: error.message });
    return [];
  }
};

module.exports = exports;
