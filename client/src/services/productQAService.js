import api from './api';

/**
 * Product Q&A Service
 * Handles product questions and answers
 */

/**
 * Get questions for a product
 * @param {string} productId - Product ID
 * @param {number} page - Page number
 * @param {number} limit - Questions per page
 * @returns {Promise<Object>} Questions data
 */
export const getProductQuestions = async (productId, page = 1, limit = 10) => {
  const response = await api.get(`/products/${productId}/questions`, {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Ask a question about a product
 * @param {string} productId - Product ID
 * @param {string} question - Question text
 * @returns {Promise<Object>} Created question
 */
export const askQuestion = async (productId, question) => {
  const response = await api.post(`/products/${productId}/questions`, {
    question,
  });
  return response.data;
};

/**
 * Answer a question (Seller only)
 * @param {string} questionId - Question ID
 * @param {string} answer - Answer text
 * @returns {Promise<Object>} Updated question
 */
export const answerQuestion = async (questionId, answer) => {
  const response = await api.put(`/questions/${questionId}/answer`, {
    answer,
  });
  return response.data;
};

/**
 * Mark question as helpful
 * @param {string} questionId - Question ID
 * @returns {Promise<Object>} Success message
 */
export const markAsHelpful = async (questionId) => {
  const response = await api.post(`/questions/${questionId}/helpful`);
  return response.data;
};

/**
 * Delete a question
 * @param {string} questionId - Question ID
 * @returns {Promise<Object>} Success message
 */
export const deleteQuestion = async (questionId) => {
  const response = await api.delete(`/questions/${questionId}`);
  return response.data;
};

export default {
  getProductQuestions,
  askQuestion,
  answerQuestion,
  markAsHelpful,
  deleteQuestion,
};
