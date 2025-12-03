const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Product Q&A Controller
 * Handles questions and answers about products
 */

/**
 * Get questions for product
 * GET /api/products/:productId/questions
 */
exports.getProductQuestions = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      prisma.productQA.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { helpfulCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.productQA.count({
        where: { productId },
      }),
    ]);

    res.json({
      success: true,
      questions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get product questions error:', { error: error.message, productId: req.params.productId });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve questions',
    });
  }
};

/**
 * Ask question
 * POST /api/products/:productId/questions
 */
exports.askQuestion = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    const { question } = req.body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
      });
    }

    // Create question
    const qa = await prisma.productQA.create({
      data: {
        userId,
        productId,
        question,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Question asked', { qaId: qa.id, productId, userId });

    res.json({
      success: true,
      message: 'Question submitted successfully',
      question: qa,
    });
  } catch (error) {
    logger.error('Ask question error:', { error: error.message, productId: req.params.productId });
    res.status(500).json({
      error: true,
      message: 'Failed to submit question',
    });
  }
};

/**
 * Answer question (Seller only)
 * PUT /api/questions/:id/answer
 */
exports.answerQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { answer } = req.body;

    // Check if question exists and user is the seller
    const qa = await prisma.productQA.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            sellerId: true,
          },
        },
      },
    });

    if (!qa) {
      return res.status(404).json({
        error: true,
        message: 'Question not found',
      });
    }

    if (qa.product.sellerId !== userId) {
      return res.status(403).json({
        error: true,
        message: 'Only the seller can answer this question',
      });
    }

    // Update with answer
    const updatedQA = await prisma.productQA.update({
      where: { id },
      data: {
        answer,
        answeredAt: new Date(),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Question answered', { qaId: id, userId });

    res.json({
      success: true,
      message: 'Answer submitted successfully',
      question: updatedQA,
    });
  } catch (error) {
    logger.error('Answer question error:', { error: error.message, questionId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to submit answer',
    });
  }
};

/**
 * Mark question as helpful
 * POST /api/questions/:id/helpful
 */
exports.markAsHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedQA = await prisma.productQA.update({
      where: { id },
      data: {
        helpfulCount: { increment: 1 },
      },
    });

    res.json({
      success: true,
      message: 'Marked as helpful',
      helpfulCount: updatedQA.helpfulCount,
    });
  } catch (error) {
    logger.error('Mark as helpful error:', { error: error.message, questionId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to mark as helpful',
    });
  }
};

/**
 * Delete question
 * DELETE /api/questions/:id
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const qa = await prisma.productQA.findUnique({
      where: { id },
    });

    if (!qa) {
      return res.status(404).json({
        error: true,
        message: 'Question not found',
      });
    }

    // Only the user who asked or admin can delete
    if (qa.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    await prisma.productQA.delete({
      where: { id },
    });

    logger.info('Question deleted', { qaId: id, userId });

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    logger.error('Delete question error:', { error: error.message, questionId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to delete question',
    });
  }
};

module.exports = exports;
