const logger = require('../lib/logger');

/**
 * SEO Middleware
 * Handles dynamic meta tags, structured data, and SEO optimization
 */

class SEOMiddleware {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'https://kodo.com';
    this.siteName = 'KODO Marketplace';
    this.defaultImage = `${this.baseUrl}/og-image.png`;
    this.twitterHandle = '@KODOMarket';
  }

  /**
   * Generate meta tags for a page
   */
  generateMetaTags(options = {}) {
    const {
      title = 'KODO - Buy, Sell & Deliver with Real-time Tracking',
      description = 'Nigeria\'s premier marketplace for buying and selling with integrated real-time delivery tracking, secure payments, and verified sellers.',
      image = this.defaultImage,
      url = this.baseUrl,
      type = 'website',
      keywords = [],
      author = 'KODO',
      canonical = url,
      noindex = false,
      nofollow = false,
    } = options;

    const metaTags = {
      // Basic meta tags
      title,
      description,
      author,
      keywords: keywords.length > 0 ? keywords.join(', ') : 'marketplace, delivery, shopping, online store, Nigeria, e-commerce, buy, sell',
      canonical,
      
      // Open Graph
      'og:type': type,
      'og:site_name': this.siteName,
      'og:title': title,
      'og:description': description,
      'og:image': image,
      'og:url': url,
      'og:locale': 'en_NG',
      
      // Twitter Card
      'twitter:card': 'summary_large_image',
      'twitter:site': this.twitterHandle,
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': image,
      
      // Robots
      robots: `${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`,
    };

    return metaTags;
  }

  /**
   * Generate structured data (JSON-LD) for a product
   */
  generateProductSchema(product, seller) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description,
      image: product.images || [],
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency || 'NGN',
        availability: product.status === 'available' 
          ? 'https://schema.org/InStock' 
          : 'https://schema.org/OutOfStock',
        url: `${this.baseUrl}/products/${product.id}`,
        seller: {
          '@type': 'Person',
          name: seller.businessName || seller.username,
        },
      },
      brand: {
        '@type': 'Brand',
        name: seller.businessName || seller.username,
      },
      condition: this.mapConditionToSchema(product.condition),
    };

    if (product.averageRating && product.reviewCount > 0) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.averageRating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }

    if (product.category) {
      schema.category = product.category;
    }

    return schema;
  }

  /**
   * Generate structured data for an organization
   */
  generateOrganizationSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.siteName,
      url: this.baseUrl,
      logo: `${this.baseUrl}/logo.png`,
      description: 'Nigeria\'s premier marketplace for buying and selling with integrated delivery tracking',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+234-XXX-XXX-XXXX',
        contactType: 'Customer Service',
        areaServed: 'NG',
        availableLanguage: ['English'],
      },
      sameAs: [
        'https://facebook.com/KODOMarket',
        'https://twitter.com/KODOMarket',
        'https://instagram.com/KODOMarket',
      ],
    };
  }

  /**
   * Generate structured data for breadcrumbs
   */
  generateBreadcrumbSchema(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${this.baseUrl}${item.url}`,
      })),
    };
  }

  /**
   * Generate structured data for a seller
   */
  generateSellerSchema(seller) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': seller.businessName ? 'LocalBusiness' : 'Person',
      name: seller.businessName || `${seller.firstName} ${seller.lastName}`,
      url: `${this.baseUrl}/sellers/${seller.id}`,
    };

    if (seller.businessDescription) {
      schema.description = seller.businessDescription;
    }

    if (seller.businessLogo) {
      schema.image = seller.businessLogo;
    }

    if (seller.sellerNiche) {
      schema.knowsAbout = seller.sellerNiche;
    }

    return schema;
  }

  /**
   * Generate sitemap entry
   */
  generateSitemapEntry(url, options = {}) {
    const {
      changefreq = 'weekly',
      priority = 0.5,
      lastmod = new Date().toISOString(),
    } = options;

    return {
      loc: `${this.baseUrl}${url}`,
      lastmod,
      changefreq,
      priority,
    };
  }

  /**
   * Map product condition to schema.org values
   */
  mapConditionToSchema(condition) {
    const mapping = {
      new: 'https://schema.org/NewCondition',
      like_new: 'https://schema.org/RefurbishedCondition',
      good: 'https://schema.org/UsedCondition',
      fair: 'https://schema.org/UsedCondition',
      poor: 'https://schema.org/DamagedCondition',
    };

    return mapping[condition] || 'https://schema.org/UsedCondition';
  }

  /**
   * Middleware to add SEO headers
   */
  seoHeaders = (req, res, next) => {
    // Add SEO-friendly headers
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Cache control for better performance
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    next();
  };

  /**
   * Middleware to track and respond with SEO data
   */
  provideSEOData = (type) => {
    return (req, res, next) => {
      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to add SEO data
      res.json = (data) => {
        let seoData = {};

        try {
          if (type === 'product' && data.product) {
            const product = data.product;
            const seller = product.seller || {};

            seoData = {
              meta: this.generateMetaTags({
                title: `${product.title} - ${seller.businessName || 'KODO'}`,
                description: product.description?.substring(0, 160) || 'View this product on KODO Marketplace',
                image: product.images?.[0] || this.defaultImage,
                url: `${this.baseUrl}/products/${product.id}`,
                type: 'product',
                keywords: [product.category, product.condition, seller.sellerNiche].filter(Boolean),
              }),
              structuredData: this.generateProductSchema(product, seller),
              breadcrumbs: this.generateBreadcrumbSchema([
                { name: 'Home', url: '/' },
                { name: 'Products', url: '/products' },
                { name: product.category || 'Category', url: `/products?category=${product.category}` },
                { name: product.title, url: `/products/${product.id}` },
              ]),
            };
          } else if (type === 'seller' && data.user) {
            const seller = data.user;

            seoData = {
              meta: this.generateMetaTags({
                title: `${seller.businessName || seller.username} - Seller Profile`,
                description: seller.businessDescription || `View products from ${seller.businessName || seller.username}`,
                url: `${this.baseUrl}/sellers/${seller.id}`,
                type: 'profile',
              }),
              structuredData: this.generateSellerSchema(seller),
            };
          } else if (type === 'products' && data.products) {
            seoData = {
              meta: this.generateMetaTags({
                title: 'Browse Products - KODO Marketplace',
                description: `Discover ${data.products.length} products on KODO. Shop electronics, fashion, home goods, and more with secure delivery.`,
                url: `${this.baseUrl}/products`,
              }),
              structuredData: this.generateOrganizationSchema(),
            };
          }

          // Add SEO data to response
          if (Object.keys(seoData).length > 0) {
            data._seo = seoData;
          }
        } catch (error) {
          logger.error('SEO data generation error:', error);
        }

        return originalJson(data);
      };

      next();
    };
  };
}

module.exports = new SEOMiddleware();
