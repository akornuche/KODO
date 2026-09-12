import { computed, unref } from 'vue';
import { useHead } from '@vueuse/head';

export function useBreadcrumbs(items) {
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://kodo.com';

  const breadcrumbList = computed(() => {
    const resolvedItems = typeof items === 'function' ? items() : unref(items);
    const list = resolvedItems || [];

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: list.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${baseUrl}${item.url}`,
      })),
    };
  });

  // Register once inside component setup; the computed value keeps JSON-LD current.
  useHead(computed(() => ({
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(breadcrumbList.value),
      },
    ],
  })));

  return { breadcrumbList };
}
