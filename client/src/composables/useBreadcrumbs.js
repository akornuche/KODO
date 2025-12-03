import { useHead } from '@vueuse/head';

/**
 * Composable for adding breadcrumb structured data
 * Usage: useBreadcrumbs([
 *   { name: 'Home', url: '/' },
 *   { name: 'Products', url: '/products' },
 *   { name: 'Electronics', url: '/products?category=electronics' }
 * ])
 */
export function useBreadcrumbs(items) {
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://kodo.com';

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`
    }))
  };

  useHead({
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(breadcrumbList)
      }
    ]
  });

  return { breadcrumbList };
}
