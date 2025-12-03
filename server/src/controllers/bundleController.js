const prisma = require('../../config/db');

/**
 * Get cross-sell suggestions
 * @route GET /api/bundles/cross-sell/:productId
 */
const getCrossSellSuggestions = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find frequently bought together (from completed orders)
    const frequentlyBoughtTogether = await prisma.$queryRaw`
      SELECT p.*, COUNT(*) as frequency
      FROM "Product" p
      INNER JOIN "OrderItem" oi1 ON p.id = oi1."productId"
      INNER JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId"
      INNER JOIN "Order" o ON oi1."orderId" = o.id
      WHERE oi2."productId" = ${productId}
        AND oi1."productId" != ${productId}
        AND o.status IN ('completed', 'delivered')
        AND p."isActive" = true
      GROUP BY p.id
      ORDER BY frequency DESC
      LIMIT ${parseInt(limit)}
    `;

    // If not enough frequently bought together, add same category products
    if (frequentlyBoughtTogether.length < parseInt(limit)) {
      const remainingLimit = parseInt(limit) - frequentlyBoughtTogether.length;
      const existingIds = frequentlyBoughtTogether.map(p => p.id);

      const categoryProducts = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          isActive: true,
          id: {
            notIn: [...existingIds, productId],
          },
        },
        take: remainingLimit,
        orderBy: { avgRating: 'desc' },
      });

      frequentlyBoughtTogether.push(...categoryProducts);
    }

    res.json({
      productId,
      suggestions: frequentlyBoughtTogether,
    });
  } catch (error) {
    console.error('Get cross-sell suggestions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get upsell suggestions (higher value alternatives)
 * @route GET /api/bundles/upsell/:productId
 */
const getUpsellSuggestions = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find products in same category with higher price but similar attributes
    const priceThreshold = product.price * 1.2; // 20% to 100% higher
    const maxPrice = product.price * 2;

    const upsellProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        isActive: true,
        price: {
          gte: priceThreshold,
          lte: maxPrice,
        },
        id: { not: productId },
      },
      take: parseInt(limit),
      orderBy: [
        { avgRating: 'desc' },
        { price: 'asc' },
      ],
    });

    res.json({
      productId,
      currentPrice: product.price,
      suggestions: upsellProducts.map(p => ({
        ...p,
        priceDifference: p.price - product.price,
        percentageIncrease: ((p.price - product.price) / product.price * 100).toFixed(1),
      })),
    });
  } catch (error) {
    console.error('Get upsell suggestions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create product bundle
 * @route POST /api/bundles
 */
const createBundle = async (req, res) => {
  try {
    const {
      name,
      description,
      productIds,
      discountType, // 'percentage' or 'fixed'
      discountValue,
    } = req.body;

    // Verify user is seller
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (user.role !== 'seller' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only sellers can create bundles' });
    }

    // Verify all products exist and calculate total
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        sellerId: req.user.id,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: 'Some products not found or not owned by you' });
    }

    const originalTotal = products.reduce((sum, p) => sum + p.price, 0);
    let bundlePrice;

    if (discountType === 'percentage') {
      bundlePrice = originalTotal * (1 - discountValue / 100);
    } else {
      bundlePrice = originalTotal - discountValue;
    }

    if (bundlePrice <= 0) {
      return res.status(400).json({ message: 'Bundle price must be positive' });
    }

    // Create bundle (stored as JSON for simplicity, could be separate table)
    const bundle = {
      id: Date.now().toString(),
      name,
      description,
      productIds,
      products: products.map(p => ({ id: p.id, name: p.name, price: p.price })),
      originalTotal,
      bundlePrice,
      discountType,
      discountValue,
      savings: originalTotal - bundlePrice,
      createdAt: new Date(),
      sellerId: req.user.id,
    };

    res.status(201).json({
      message: 'Bundle created successfully',
      bundle,
    });
  } catch (error) {
    console.error('Create bundle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get bundle recommendations for cart
 * @route POST /api/bundles/cart-recommendations
 */
const getCartBundleRecommendations = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || productIds.length === 0) {
      return res.json({ recommendations: [] });
    }

    // Get products in cart
    const cartProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: { category: true },
    });

    // Find complementary products based on category
    const categoryIds = [...new Set(cartProducts.map(p => p.categoryId))];

    const complementary = await prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        isActive: true,
        id: { notIn: productIds },
      },
      take: 6,
      orderBy: { avgRating: 'desc' },
    });

    // Calculate potential bundle savings
    const cartTotal = cartProducts.reduce((sum, p) => sum + p.price, 0);
    const recommendations = complementary.map(product => {
      const bundleTotal = cartTotal + product.price;
      const suggestedDiscount = 10; // 10% bundle discount
      const savingsAmount = bundleTotal * (suggestedDiscount / 100);

      return {
        product,
        bundlePrice: bundleTotal - savingsAmount,
        originalPrice: bundleTotal,
        savings: savingsAmount,
        discountPercentage: suggestedDiscount,
      };
    });

    res.json({
      cartTotal,
      recommendations,
    });
  } catch (error) {
    console.error('Get cart bundle recommendations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCrossSellSuggestions,
  getUpsellSuggestions,
  createBundle,
  getCartBundleRecommendations,
};
