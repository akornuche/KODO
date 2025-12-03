import { useHead } from '@vueuse/head';
import { computed } from 'vue';

/**
 * Composable for managing SEO meta tags
 * Usage: useSEO({ title, description, image, url, type, structuredData })
 */
export function useSEO(options) {
  const {
    title,
    description,
    image,
    url,
    type = 'website',
    keywords,
    structuredData,
    canonical,
  } = options;

  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://kodo.com';
  const defaultImage = `${baseUrl}/og-image.png`; // Using PNG for better social media compatibility

  const computedTitle = computed(() => 
    typeof title === 'function' ? title() : title?.value || title || 'KODO - Marketplace & Delivery'
  );

  const computedDescription = computed(() => 
    typeof description === 'function' ? description() : description?.value || description || 'Buy, sell, and deliver goods with real-time tracking and secure payments'
  );

  const computedImage = computed(() => 
    typeof image === 'function' ? image() : image?.value || image || defaultImage
  );

  const computedUrl = computed(() => {
    const urlValue = typeof url === 'function' ? url() : url?.value || url;
    return urlValue ? `${baseUrl}${urlValue}` : baseUrl;
  });

  const computedCanonical = computed(() => {
    const canonicalValue = typeof canonical === 'function' ? canonical() : canonical?.value || canonical;
    return canonicalValue || computedUrl.value;
  });

  const headConfig = computed(() => {
    const config = {
      title: computedTitle.value,
      meta: [
        // Basic meta tags
        {
          name: 'description',
          content: computedDescription.value,
        },
        {
          name: 'author',
          content: 'KODO',
        },
        
        // Open Graph
        {
          property: 'og:type',
          content: type,
        },
        {
          property: 'og:site_name',
          content: 'KODO Marketplace',
        },
        {
          property: 'og:title',
          content: computedTitle.value,
        },
        {
          property: 'og:description',
          content: computedDescription.value,
        },
        {
          property: 'og:image',
          content: computedImage.value,
        },
        {
          property: 'og:url',
          content: computedUrl.value,
        },
        {
          property: 'og:locale',
          content: 'en_NG',
        },
        
        // Twitter Card
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:site',
          content: '@KODOMarket',
        },
        {
          name: 'twitter:title',
          content: computedTitle.value,
        },
        {
          name: 'twitter:description',
          content: computedDescription.value,
        },
        {
          name: 'twitter:image',
          content: computedImage.value,
        },
      ],
      link: [
        {
          rel: 'canonical',
          href: computedCanonical.value,
        },
      ],
    };

    // Add keywords if provided
    if (keywords) {
      const keywordValue = typeof keywords === 'function' ? keywords() : keywords?.value || keywords;
      const keywordString = Array.isArray(keywordValue) ? keywordValue.join(', ') : keywordValue;
      
      if (keywordString) {
        config.meta.push({
          name: 'keywords',
          content: keywordString,
        });
      }
    }

    // Add structured data if provided
    if (structuredData) {
      const dataValue = typeof structuredData === 'function' ? structuredData() : structuredData?.value || structuredData;
      
      if (dataValue && Object.keys(dataValue).length > 0) {
        config.script = [
          {
            type: 'application/ld+json',
            children: JSON.stringify(dataValue),
          },
        ];
      }
    }

    return config;
  });

  useHead(headConfig);

  return {
    title: computedTitle,
    description: computedDescription,
    image: computedImage,
    url: computedUrl,
  };
}

/**
 * Product SEO helper
 */
export function useProductSEO(product) {
  return useSEO({
    title: computed(() => product.value ? `${product.value.title} | KODO` : 'Product | KODO'),
    description: computed(() => product.value?.description?.substring(0, 160) || 'View this product on KODO Marketplace'),
    image: computed(() => product.value?.images?.[0] || null),
    url: computed(() => product.value ? `/products/${product.value.id}` : '/products'),
    type: 'product',
    keywords: computed(() => {
      if (!product.value) return [];
      return [
        product.value.category,
        product.value.condition,
        product.value.seller?.sellerNiche,
        'Nigeria',
        'marketplace',
      ].filter(Boolean);
    }),
    structuredData: computed(() => {
      if (!product.value) return null;
      
      const seller = product.value.seller || {};
      
      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.value.title,
        description: product.value.description,
        image: product.value.images || [],
        offers: {
          '@type': 'Offer',
          price: product.value.price,
          priceCurrency: product.value.currency || 'NGN',
          availability: product.value.status === 'available' 
            ? 'https://schema.org/InStock' 
            : 'https://schema.org/OutOfStock',
          url: `${import.meta.env.VITE_BASE_URL || 'https://kodo.com'}/products/${product.value.id}`,
          seller: {
            '@type': 'Person',
            name: seller.businessName || seller.username,
          },
        },
        brand: {
          '@type': 'Brand',
          name: seller.businessName || seller.username,
        },
        condition: mapConditionToSchema(product.value.condition),
        ...(product.value.averageRating && product.value.reviewCount > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.value.averageRating,
            reviewCount: product.value.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        } : {}),
      };
    }),
    canonical: computed(() => product.value ? `/products/${product.value.id}` : null),
  });
}

/**
 * Seller SEO helper
 */
export function useSellerSEO(seller) {
  return useSEO({
    title: computed(() => seller.value ? `${seller.value.businessName || seller.value.username} | KODO Seller` : 'Seller Profile | KODO'),
    description: computed(() => seller.value?.businessDescription || `View products from ${seller.value?.businessName || seller.value?.username || 'this seller'}`),
    image: computed(() => seller.value?.businessLogo || seller.value?.profilePhotoUrl || null),
    url: computed(() => seller.value ? `/sellers/${seller.value.id}` : '/sellers'),
    type: 'profile',
    keywords: computed(() => {
      if (!seller.value) return [];
      return [
        seller.value.sellerNiche,
        'seller',
        'Nigeria',
        'marketplace',
      ].filter(Boolean);
    }),
    structuredData: computed(() => {
      if (!seller.value) return null;
      
      return {
        '@context': 'https://schema.org',
        '@type': seller.value.businessName ? 'LocalBusiness' : 'Person',
        name: seller.value.businessName || `${seller.value.firstName || ''} ${seller.value.lastName || ''}`.trim(),
        url: `${import.meta.env.VITE_BASE_URL || 'https://kodo.com'}/sellers/${seller.value.id}`,
        ...(seller.value.businessDescription ? { description: seller.value.businessDescription } : {}),
        ...(seller.value.businessLogo ? { image: seller.value.businessLogo } : {}),
        ...(seller.value.sellerNiche ? { knowsAbout: seller.value.sellerNiche } : {}),
      };
    }),
    canonical: computed(() => seller.value ? `/sellers/${seller.value.id}` : null),
  });
}

/**
 * Category/List SEO helper
 */
export function useCategorySEO(category, count) {
  return useSEO({
    title: computed(() => category.value ? `${category.value} Products | KODO` : 'Browse Products | KODO'),
    description: computed(() => {
      const countValue = typeof count === 'function' ? count() : count?.value || count || 0;
      return category.value 
        ? `Discover ${countValue} ${category.value} products on KODO. Shop with secure delivery in Nigeria.`
        : `Discover products on KODO. Shop electronics, fashion, home goods, and more with secure delivery.`;
    }),
    url: computed(() => category.value ? `/products?category=${encodeURIComponent(category.value)}` : '/products'),
    type: 'website',
    keywords: computed(() => {
      if (!category.value) return ['marketplace', 'Nigeria', 'shopping', 'online store'];
      return [category.value, 'marketplace', 'Nigeria', 'shopping'];
    }),
  });
}

/**
 * Map product condition to schema.org values
 */
function mapConditionToSchema(condition) {
  const mapping = {
    new: 'https://schema.org/NewCondition',
    like_new: 'https://schema.org/RefurbishedCondition',
    good: 'https://schema.org/UsedCondition',
    fair: 'https://schema.org/UsedCondition',
    poor: 'https://schema.org/DamagedCondition',
  };

  return mapping[condition] || 'https://schema.org/UsedCondition';
}
