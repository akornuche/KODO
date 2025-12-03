const express = require('express');
const router = express.Router();
const sitemapGenerator = require('../lib/sitemapGenerator');
const seoMiddleware = require('../middleware/seoMiddleware');
const { authenticateToken, requireRole } = require('../../middleware/auth');

/**
 * Serve robots.txt
 */
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'https://kodo.com';
  
  const robotsTxt = `# KODO Marketplace - Robots.txt
User-agent: *
Allow: /
Allow: /products
Allow: /products/*
Allow: /sellers
Allow: /sellers/*
Allow: /categories
Disallow: /admin
Disallow: /api
Disallow: /checkout
Disallow: /orders
Disallow: /profile
Disallow: */private/*
Disallow: */draft/*

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for politeness
Crawl-delay: 1

# Block bad bots
User-agent: AhrefsBot
User-agent: SemrushBot
Crawl-delay: 10
`;

  res.type('text/plain');
  res.send(robotsTxt);
});

/**
 * Serve sitemap.xml
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    let sitemap = sitemapGenerator.getSitemap();
    
    // Generate if doesn't exist
    if (!sitemap) {
      await sitemapGenerator.generateSitemap();
      sitemap = sitemapGenerator.getSitemap();
    }

    if (!sitemap) {
      return res.status(404).send('Sitemap not found');
    }

    res.type('application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Generate sitemap (admin only)
 */
router.post('/sitemap/generate', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await sitemapGenerator.generateSitemap();
    
    res.json({
      message: 'Sitemap generated successfully',
      ...result,
    });
  } catch (error) {
    console.error('Generate sitemap error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to generate sitemap',
    });
  }
});

/**
 * Get SEO metadata for a URL
 */
router.get('/seo/metadata', (req, res) => {
  const { url, type = 'generic' } = req.query;

  if (!url) {
    return res.status(400).json({
      error: true,
      message: 'URL parameter is required',
    });
  }

  const metaTags = seoMiddleware.generateMetaTags({
    url,
    title: `KODO - ${type}`,
    description: 'Discover products on KODO Marketplace',
  });

  res.json({
    meta: metaTags,
    structuredData: seoMiddleware.generateOrganizationSchema(),
  });
});

module.exports = router;
