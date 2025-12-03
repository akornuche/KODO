const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify/sync');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Report Generator
 * Generates PDF and CSV reports for sales, orders, products, users, etc.
 */

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   */
  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generate PDF report
   */
  async generatePDF(data, options = {}) {
    const {
      title = 'Report',
      type = 'generic',
      filename,
      includeChart = false,
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          logger.info(`PDF report generated: ${title}`);
          resolve(buffer);
        });
        doc.on('error', reject);

        // Header
        this.addPDFHeader(doc, title);

        // Content based on report type
        switch (type) {
          case 'sales':
            this.addSalesReportContent(doc, data);
            break;
          case 'products':
            this.addProductsReportContent(doc, data);
            break;
          case 'orders':
            this.addOrdersReportContent(doc, data);
            break;
          case 'users':
            this.addUsersReportContent(doc, data);
            break;
          default:
            this.addGenericReportContent(doc, data);
        }

        // Footer
        this.addPDFFooter(doc);

        doc.end();
      } catch (error) {
        logger.error('PDF generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Add PDF header
   */
  addPDFHeader(doc, title) {
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown();

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
      .text(`KODO Marketplace`, { align: 'center' })
      .moveDown(2);

    // Horizontal line
    doc
      .strokeColor('#007bff')
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown();
  }

  /**
   * Add PDF footer
   */
  addPDFFooter(doc) {
    const bottomY = doc.page.height - 50;
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        'This report is confidential and intended for authorized use only.',
        50,
        bottomY,
        { align: 'center', width: 500 }
      );
  }

  /**
   * Add sales report content
   */
  addSalesReportContent(doc, data) {
    const { summary, transactions, dateRange } = data;

    doc.fontSize(16).font('Helvetica-Bold').text('Sales Summary').moveDown();

    if (dateRange) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Period: ${dateRange.start} to ${dateRange.end}`)
        .moveDown();
    }

    // Summary metrics
    if (summary) {
      const metrics = [
        ['Total Revenue', `$${summary.totalRevenue?.toFixed(2) || '0.00'}`],
        ['Total Orders', summary.totalOrders || 0],
        ['Completed Orders', summary.completedOrders || 0],
        ['Average Order Value', `$${summary.avgOrderValue?.toFixed(2) || '0.00'}`],
        ['Total Customers', summary.totalCustomers || 0],
      ];

      metrics.forEach(([label, value]) => {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(label, 50, doc.y, { continued: true })
          .font('Helvetica')
          .text(`: ${value}`, { align: 'right' })
          .moveDown(0.5);
      });

      doc.moveDown();
    }

    // Transaction details
    if (transactions && transactions.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Recent Transactions')
        .moveDown(0.5);

      const tableTop = doc.y;
      const itemHeight = 25;
      
      // Table headers
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Date', 50, tableTop)
        .text('Order ID', 120, tableTop)
        .text('Customer', 200, tableTop)
        .text('Amount', 350, tableTop)
        .text('Status', 450, tableTop);

      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      let currentY = tableTop + 20;

      transactions.slice(0, 20).forEach((transaction, index) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            new Date(transaction.createdAt).toLocaleDateString(),
            50,
            currentY
          )
          .text(transaction.id?.toString() || 'N/A', 120, currentY)
          .text(transaction.buyer?.username || 'N/A', 200, currentY)
          .text(`$${transaction.totalAmount?.toFixed(2)}`, 350, currentY)
          .text(transaction.status || 'N/A', 450, currentY);

        currentY += itemHeight;
      });
    }
  }

  /**
   * Add products report content
   */
  addProductsReportContent(doc, data) {
    const { products, summary } = data;

    doc.fontSize(16).font('Helvetica-Bold').text('Products Report').moveDown();

    if (summary) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Total Products: ${summary.total || 0}`)
        .text(`Active Products: ${summary.active || 0}`)
        .text(`Sold Products: ${summary.sold || 0}`)
        .text(`Average Price: $${summary.avgPrice?.toFixed(2) || '0.00'}`)
        .moveDown(2);
    }

    if (products && products.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Product List')
        .moveDown(0.5);

      products.slice(0, 30).forEach((product, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`${index + 1}. ${product.title || 'Untitled'}`)
          .fontSize(9)
          .font('Helvetica')
          .text(`   Price: $${product.price?.toFixed(2)} | Status: ${product.status} | Condition: ${product.condition}`)
          .moveDown(0.5);
      });
    }
  }

  /**
   * Add orders report content
   */
  addOrdersReportContent(doc, data) {
    const { orders, summary } = data;

    doc.fontSize(16).font('Helvetica-Bold').text('Orders Report').moveDown();

    if (summary) {
      const statusBreakdown = summary.byStatus || {};
      
      doc.fontSize(12).font('Helvetica').text('Order Summary:').moveDown(0.5);

      Object.entries(statusBreakdown).forEach(([status, count]) => {
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`  ${status}: ${count}`)
          .moveDown(0.3);
      });

      doc.moveDown();
    }

    if (orders && orders.length > 0) {
      orders.slice(0, 25).forEach((order, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`Order #${order.id}`)
          .fontSize(9)
          .font('Helvetica')
          .text(`  Product: ${order.product?.title || 'N/A'}`)
          .text(`  Amount: $${order.totalAmount?.toFixed(2)}`)
          .text(`  Status: ${order.status}`)
          .text(`  Date: ${new Date(order.createdAt).toLocaleDateString()}`)
          .moveDown(0.5);
      });
    }
  }

  /**
   * Add users report content
   */
  addUsersReportContent(doc, data) {
    const { users, summary } = data;

    doc.fontSize(16).font('Helvetica-Bold').text('Users Report').moveDown();

    if (summary) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Total Users: ${summary.total || 0}`)
        .text(`Buyers: ${summary.buyers || 0}`)
        .text(`Sellers: ${summary.sellers || 0}`)
        .text(`Couriers: ${summary.couriers || 0}`)
        .text(`New This Month: ${summary.newThisMonth || 0}`)
        .moveDown(2);
    }

    if (users && users.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('User List')
        .moveDown(0.5);

      users.slice(0, 40).forEach((user, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`)
          .fontSize(9)
          .text(`   Email: ${user.email} | Role: ${user.role} | Joined: ${new Date(user.createdAt).toLocaleDateString()}`)
          .moveDown(0.5);
      });
    }
  }

  /**
   * Add generic report content
   */
  addGenericReportContent(doc, data) {
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(JSON.stringify(data, null, 2))
      .moveDown();
  }

  /**
   * Generate CSV report
   */
  async generateCSV(data, options = {}) {
    const { type = 'generic', filename, columns } = options;

    try {
      let records = [];
      let csvColumns = columns;

      // Prepare data based on type
      switch (type) {
        case 'sales':
          records = data.transactions || [];
          csvColumns = csvColumns || [
            { key: 'id', header: 'Order ID' },
            { key: 'createdAt', header: 'Date' },
            { key: 'buyer.username', header: 'Customer' },
            { key: 'totalAmount', header: 'Amount' },
            { key: 'currency', header: 'Currency' },
            { key: 'status', header: 'Status' },
          ];
          break;
        case 'products':
          records = data.products || [];
          csvColumns = csvColumns || [
            { key: 'id', header: 'Product ID' },
            { key: 'title', header: 'Title' },
            { key: 'price', header: 'Price' },
            { key: 'currency', header: 'Currency' },
            { key: 'condition', header: 'Condition' },
            { key: 'status', header: 'Status' },
            { key: 'seller.username', header: 'Seller' },
          ];
          break;
        case 'orders':
          records = data.orders || [];
          csvColumns = csvColumns || [
            { key: 'id', header: 'Order ID' },
            { key: 'createdAt', header: 'Date' },
            { key: 'product.title', header: 'Product' },
            { key: 'totalAmount', header: 'Amount' },
            { key: 'status', header: 'Status' },
            { key: 'buyer.username', header: 'Buyer' },
            { key: 'seller.username', header: 'Seller' },
          ];
          break;
        case 'users':
          records = data.users || [];
          csvColumns = csvColumns || [
            { key: 'id', header: 'User ID' },
            { key: 'username', header: 'Username' },
            { key: 'email', header: 'Email' },
            { key: 'firstName', header: 'First Name' },
            { key: 'lastName', header: 'Last Name' },
            { key: 'role', header: 'Role' },
            { key: 'createdAt', header: 'Joined Date' },
          ];
          break;
        default:
          records = Array.isArray(data) ? data : [data];
      }

      // Convert to CSV format
      const csvData = records.map(record => {
        const row = {};
        csvColumns.forEach(col => {
          const keys = col.key.split('.');
          let value = record;
          for (const key of keys) {
            value = value?.[key];
          }
          row[col.header] = value || '';
        });
        return row;
      });

      const headers = csvColumns.map(col => col.header);
      const csvString = stringify(csvData, {
        header: true,
        columns: headers,
      });

      logger.info(`CSV report generated: ${type}`);

      return csvString;
    } catch (error) {
      logger.error('CSV generation error:', error);
      throw error;
    }
  }

  /**
   * Get report file
   */
  getReportFile(filename) {
    const filepath = path.join(this.reportsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      throw new Error('Report file not found');
    }

    return {
      filepath,
      filename,
      size: fs.statSync(filepath).size,
    };
  }

  /**
   * Delete report file
   */
  deleteReportFile(filename) {
    const filepath = path.join(this.reportsDir, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.info(`Report deleted: ${filename}`);
      return true;
    }

    return false;
  }

  /**
   * List all reports
   */
  listReports() {
    const files = fs.readdirSync(this.reportsDir);
    
    return files.map(filename => {
      const filepath = path.join(this.reportsDir, filename);
      const stats = fs.statSync(filepath);
      
      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        format: path.extname(filename).slice(1).toUpperCase(),
      };
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Clean old reports (older than specified days)
   */
  cleanOldReports(days = 30) {
    const files = this.listReports();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let deleted = 0;

    files.forEach(file => {
      if (file.createdAt < cutoffDate) {
        this.deleteReportFile(file.filename);
        deleted++;
      }
    });

    logger.info(`Cleaned ${deleted} old reports`);
    return deleted;
  }
}

module.exports = new ReportGenerator();
