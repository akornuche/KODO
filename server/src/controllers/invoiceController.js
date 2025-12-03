const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { generateInvoiceNumber, calculateTax, calculateCommission, formatCurrency } = require('../lib/utils');

/**
 * Invoice Controller
 * Handles invoice generation and tax calculations
 */

/**
 * Get invoices for user
 * GET /api/invoices
 */
exports.getInvoices = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { userId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.invoice.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get invoices error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve invoices',
    });
  }
};

/**
 * Get invoice by ID
 * GET /api/invoices/:id
 */
exports.getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    title: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        error: true,
        message: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      invoice,
    });
  } catch (error) {
    logger.error('Get invoice error:', { error: error.message, invoiceId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve invoice',
    });
  }
};

/**
 * Generate invoice for order
 * POST /api/invoices/generate/:orderId
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Check if order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
      });
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { orderId },
    });

    if (existingInvoice) {
      return res.status(400).json({
        error: true,
        message: 'Invoice already exists for this order',
        invoice: existingInvoice,
      });
    }

    // Calculate amounts
    const subtotal = order.totalAmount;
    const taxAmount = calculateTax(subtotal);
    const totalAmount = subtotal + taxAmount;

    // Generate invoice
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        orderId,
        invoiceNumber: generateInvoiceNumber(),
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        taxRate: 7.5, // Nigeria VAT
        currency: 'NGN',
      },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    title: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    logger.info('Invoice generated', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderId,
      userId,
    });

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      invoice,
    });
  } catch (error) {
    logger.error('Generate invoice error:', { error: error.message, orderId: req.params.orderId });
    res.status(500).json({
      error: true,
      message: 'Failed to generate invoice',
    });
  }
};

/**
 * Download invoice as PDF
 * GET /api/invoices/:id/download
 */
exports.downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    title: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        error: true,
        message: 'Invoice not found',
      });
    }

    // TODO: Generate PDF using library like pdfkit or puppeteer
    // For now, return invoice data as JSON
    // In production, this should generate and return a PDF buffer

    res.json({
      success: true,
      message: 'PDF generation not yet implemented',
      invoice,
      // TODO: Replace with PDF buffer
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      // res.send(pdfBuffer);
    });
  } catch (error) {
    logger.error('Download invoice error:', { error: error.message, invoiceId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to download invoice',
    });
  }
};

/**
 * Calculate tax estimate
 * POST /api/invoices/calculate-tax
 */
exports.calculateTaxEstimate = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid amount',
      });
    }

    const taxAmount = calculateTax(amount);
    const totalAmount = amount + taxAmount;

    res.json({
      success: true,
      breakdown: {
        subtotal: amount,
        taxRate: 7.5,
        taxAmount,
        totalAmount,
        formatted: {
          subtotal: formatCurrency(amount),
          taxAmount: formatCurrency(taxAmount),
          totalAmount: formatCurrency(totalAmount),
        },
      },
    });
  } catch (error) {
    logger.error('Calculate tax error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to calculate tax',
    });
  }
};

module.exports = exports;
