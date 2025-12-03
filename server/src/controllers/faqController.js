const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * FAQ Controller
 * Handles FAQ categories and articles
 */

/**
 * Get all FAQ categories with articles
 * GET /api/faq/categories
 */
exports.getFAQCategories = async (req, res) => {
  try {
    const categories = await prisma.faqCategory.findMany({
      where: { isActive: true },
      include: {
        articles: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    logger.error('Get FAQ categories error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve FAQ categories',
    });
  }
};

/**
 * Get FAQ category by slug
 * GET /api/faq/categories/:slug
 */
exports.getFAQCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await prisma.faqCategory.findUnique({
      where: { slug },
      include: {
        articles: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        error: true,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    logger.error('Get FAQ category error:', { error: error.message, slug: req.params.slug });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve category',
    });
  }
};

/**
 * Get FAQ article by slug
 * GET /api/faq/articles/:slug
 */
exports.getFAQArticle = async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await prisma.faqArticle.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!article || !article.isPublished) {
      return res.status(404).json({
        error: true,
        message: 'Article not found',
      });
    }

    // Increment view count
    await prisma.faqArticle.update({
      where: { id: article.id },
      data: {
        viewCount: { increment: 1 },
      },
    });

    res.json({
      success: true,
      article,
    });
  } catch (error) {
    logger.error('Get FAQ article error:', { error: error.message, slug: req.params.slug });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve article',
    });
  }
};

/**
 * Search FAQ articles
 * GET /api/faq/search
 */
exports.searchFAQ = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: true,
        message: 'Search query must be at least 2 characters',
      });
    }

    const articles = await prisma.faqArticle.findMany({
      where: {
        isPublished: true,
        OR: [
          {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: parseInt(limit),
      orderBy: { viewCount: 'desc' },
    });

    res.json({
      success: true,
      articles,
      count: articles.length,
    });
  } catch (error) {
    logger.error('Search FAQ error:', { error: error.message, query: req.query.q });
    res.status(500).json({
      error: true,
      message: 'Failed to search FAQ',
    });
  }
};

/**
 * Mark article as helpful
 * POST /api/faq/articles/:id/helpful
 */
exports.markArticleHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    const article = await prisma.faqArticle.update({
      where: { id },
      data: {
        helpfulCount: helpful ? { increment: 1 } : undefined,
        notHelpfulCount: !helpful ? { increment: 1 } : undefined,
      },
    });

    res.json({
      success: true,
      helpfulCount: article.helpfulCount,
      notHelpfulCount: article.notHelpfulCount,
    });
  } catch (error) {
    logger.error('Mark article helpful error:', { error: error.message, articleId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update feedback',
    });
  }
};

/**
 * Create FAQ category (Admin only)
 * POST /api/faq/categories
 */
exports.createFAQCategory = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    const { name, slug, description, icon, order } = req.body;

    const category = await prisma.faqCategory.create({
      data: {
        name,
        slug,
        description,
        icon,
        order: order || 0,
      },
    });

    logger.info('FAQ category created', { categoryId: category.id, userId: req.user.id });

    res.json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    logger.error('Create FAQ category error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to create category',
    });
  }
};

/**
 * Create FAQ article (Admin only)
 * POST /api/faq/articles
 */
exports.createFAQArticle = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    const { categoryId, title, slug, content, order, isPublished } = req.body;

    const article = await prisma.faqArticle.create({
      data: {
        categoryId,
        title,
        slug,
        content,
        order: order || 0,
        isPublished: isPublished !== undefined ? isPublished : true,
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    logger.info('FAQ article created', { articleId: article.id, userId: req.user.id });

    res.json({
      success: true,
      message: 'Article created successfully',
      article,
    });
  } catch (error) {
    logger.error('Create FAQ article error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to create article',
    });
  }
};

/**
 * Update FAQ article (Admin only)
 * PUT /api/faq/articles/:id
 */
exports.updateFAQArticle = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const article = await prisma.faqArticle.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    logger.info('FAQ article updated', { articleId: id, userId: req.user.id });

    res.json({
      success: true,
      message: 'Article updated successfully',
      article,
    });
  } catch (error) {
    logger.error('Update FAQ article error:', { error: error.message, articleId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update article',
    });
  }
};

module.exports = exports;
