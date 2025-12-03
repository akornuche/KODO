const prisma = require('./prisma');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

/**
 * Sitemap Generator
 * Generates XML sitemaps for SEO
 */

class SitemapGenerator {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'https://kodo.com';
    this.sitemapPath = path.join(__dirname, '../../public/sitemap.xml');
  }

  /**
   * Generate complete sitemap
   */
  async generateSitemap() {
    try {
      const urls = [];

      // Static pages
      urls.push(
        this.createUrl('/', { priority: 1.0, changefreq: 'daily' }),
        this.createUrl('/products', { priority: 0.9, changefreq: 'daily' }),
        this.createUrl('/sellers', { priority: 0.8, changefreq: 'weekly' }),
        this.createUrl('/about', { priority: 0.6, changefreq: 'monthly' }),
        this.createUrl('/contact', { priority: 0.6, changefreq: 'monthly' }),
        this.createUrl('/terms', { priority: 0.4, changefreq: 'yearly' }),
        this.createUrl('/privacy', { priority: 0.4, changefreq: 'yearly' }),
      );

      // Product pages
      const products = await prisma.product.findMany({
        where: { status: 'available' },
        select: {
          id: true,
          updatedAt: true,
        },
        take: 50000, // Limit for sitemap
      });

      products.forEach(product => {
        urls.push(
          this.createUrl(`/products/${product.id}`, {
            priority: 0.8,
            changefreq: 'weekly',
            lastmod: product.updatedAt,
          })
        );
      });

      // Seller pages
      const sellers = await prisma.user.findMany({
        where: {
          role: 'seller',
          sellerOnboarded: true,
        },
        select: {
          id: true,
          updatedAt: true,
        },
        take: 10000,
      });

      sellers.forEach(seller => {
        urls.push(
          this.createUrl(`/sellers/${seller.id}`, {
            priority: 0.7,
            changefreq: 'weekly',
            lastmod: seller.updatedAt,
          })
        );
      });

      // Category pages (based on seller niches)
      const niches = await prisma.user.groupBy({
        by: ['sellerNiche'],
        where: {
          sellerNiche: { not: null },
          sellerOnboarded: true,
        },
      });

      niches.forEach(niche => {
        if (niche.sellerNiche) {
          urls.push(
            this.createUrl(`/products?category=${encodeURIComponent(niche.sellerNiche)}`, {
              priority: 0.7,
              changefreq: 'daily',
            })
          );
        }
      });

      const xml = this.generateXML(urls);
      
      // Ensure public directory exists
      const publicDir = path.dirname(this.sitemapPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      fs.writeFileSync(this.sitemapPath, xml);
      
      logger.info(`Sitemap generated with ${urls.length} URLs`);
      
      return {
        success: true,
        urls: urls.length,
        path: this.sitemapPath,
      };
    } catch (error) {
      logger.error('Sitemap generation error:', error);
      throw error;
    }
  }

  /**
   * Create a URL entry
   */
  createUrl(path, options = {}) {
    const {
      priority = 0.5,
      changefreq = 'weekly',
      lastmod = new Date(),
    } = options;

    return {
      loc: `${this.baseUrl}${path}`,
      lastmod: lastmod instanceof Date ? lastmod.toISOString().split('T')[0] : lastmod,
      changefreq,
      priority,
    };
  }

  /**
   * Generate XML from URLs
   */
  generateXML(urls) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    
    return xml;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get sitemap file
   */
  getSitemap() {
    if (!fs.existsSync(this.sitemapPath)) {
      return null;
    }

    return fs.readFileSync(this.sitemapPath, 'utf8');
  }
}

module.exports = new SitemapGenerator();
