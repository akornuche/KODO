const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const csv = require('csv-parser');
const fs = require('fs');
const { Readable } = require('stream');

/**
 * Bulk Upload Controller
 * Handles CSV/Excel bulk product uploads
 */

/**
 * Upload products via CSV
 * POST /api/bulk-upload/products
 */
exports.bulkUploadProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: true,
        message: 'CSV file is required',
      });
    }

    const products = [];
    const errors = [];
    let lineNumber = 0;

    // Parse CSV
    const readableStream = Readable.from(file.buffer.toString());
    
    readableStream
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;
        
        // Validate required fields
        if (!row.title || !row.price) {
          errors.push({
            line: lineNumber,
            message: 'Title and price are required',
            row,
          });
          return;
        }

        // Validate price
        const price = parseFloat(row.price);
        if (isNaN(price) || price < 0) {
          errors.push({
            line: lineNumber,
            message: 'Invalid price',
            row,
          });
          return;
        }

        products.push({
          title: row.title,
          description: row.description || null,
          price,
          category: row.category || null,
          tags: row.tags || null,
          condition: row.condition || 'new',
          location: row.location || null,
          sellerId: userId,
          stockQuantity: row.stockQuantity ? parseInt(row.stockQuantity) : null,
          sku: row.sku || null,
          brand: row.brand || null,
          weight: row.weight ? parseFloat(row.weight) : null,
          isDigital: row.isDigital === 'true' || row.isDigital === '1',
        });
      })
      .on('end', async () => {
        if (errors.length > 0) {
          return res.status(400).json({
            error: true,
            message: `CSV validation failed`,
            errors,
            validProducts: products.length,
          });
        }

        if (products.length === 0) {
          return res.status(400).json({
            error: true,
            message: 'No valid products found in CSV',
          });
        }

        try {
          // Bulk create products
          const result = await prisma.product.createMany({
            data: products,
            skipDuplicates: true,
          });

          logger.info('Bulk products uploaded', { userId, count: result.count });

          res.json({
            success: true,
            message: `${result.count} products uploaded successfully`,
            count: result.count,
            skipped: products.length - result.count,
          });
        } catch (dbError) {
          logger.error('Bulk upload database error:', { error: dbError.message, userId });
          res.status(500).json({
            error: true,
            message: 'Failed to save products to database',
          });
        }
      })
      .on('error', (csvError) => {
        logger.error('CSV parsing error:', { error: csvError.message, userId });
        res.status(400).json({
          error: true,
          message: 'Failed to parse CSV file',
        });
      });
  } catch (error) {
    logger.error('Bulk upload error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to process bulk upload',
    });
  }
};

/**
 * Download CSV template
 * GET /api/bulk-upload/template
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const template = `title,description,price,category,tags,condition,location,stockQuantity,sku,brand,weight,isDigital
Sample Product,This is a sample product description,99.99,Electronics,tech gadgets,new,Lagos Nigeria,100,SKU001,BrandName,0.5,false
Another Product,Another description,149.99,Fashion,clothing shoes,like_new,Abuja,50,SKU002,AnotherBrand,1.2,false`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=product-upload-template.csv');
    res.send(template);
  } catch (error) {
    logger.error('Download template error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to generate template',
    });
  }
};

/**
 * Get upload history
 * GET /api/bulk-upload/history
 */
exports.getUploadHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get products created in bulk (by date grouping)
    const uploads = await prisma.product.groupBy({
      by: ['createdAt'],
      where: {
        sellerId: userId,
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: parseInt(limit),
    });

    res.json({
      success: true,
      uploads: uploads.map(u => ({
        date: u.createdAt,
        count: u._count.id,
      })),
    });
  } catch (error) {
    logger.error('Get upload history error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve upload history',
    });
  }
};

module.exports = exports;
