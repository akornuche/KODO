import api from './api';

const faqService = {
  // Get FAQ categories
  async getCategories() {
    const response = await api.get('/faq/categories');
    return response.data;
  },

  // Get category by slug
  async getCategory(slug) {
    const response = await api.get(`/faq/categories/${slug}`);
    return response.data;
  },

  // Get article by slug
  async getArticle(slug) {
    const response = await api.get(`/faq/articles/${slug}`);
    return response.data;
  },

  // Search FAQ
  async search(query) {
    const response = await api.get('/faq/search', { params: { q: query } });
    return response.data;
  },

  // Mark article as helpful
  async markHelpful(articleId, helpful) {
    const response = await api.post(`/faq/articles/${articleId}/helpful`, { helpful });
    return response.data;
  },

  // Admin: Create category
  async createCategory(data) {
    const response = await api.post('/faq/categories', data);
    return response.data;
  },

  // Admin: Create article
  async createArticle(data) {
    const response = await api.post('/faq/articles', data);
    return response.data;
  },

  // Admin: Update article
  async updateArticle(articleId, data) {
    const response = await api.put(`/faq/articles/${articleId}`, data);
    return response.data;
  },
};

export default faqService;
