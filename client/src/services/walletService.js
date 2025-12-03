import api from './api';

const walletService = {
  // Get wallet balance and transactions
  async getWallet() {
    const response = await api.get('/wallet');
    return response.data;
  },

  // Get transaction history
  async getTransactions(params = {}) {
    const response = await api.get('/wallet/transactions', { params });
    return response.data;
  },

  // Fund wallet
  async fundWallet(amount, paymentMethod = 'stripe') {
    const response = await api.post('/wallet/fund', { amount, paymentMethod });
    return response.data;
  },

  // Withdraw from wallet
  async withdraw(amount) {
    const response = await api.post('/wallet/withdraw', { amount });
    return response.data;
  },

  // Transfer to another user
  async transfer(recipientId, amount, description = '') {
    const response = await api.post('/wallet/transfer', {
      recipientId,
      amount,
      description,
    });
    return response.data;
  },

  // Get withdrawal history
  async getWithdrawals() {
    const response = await api.get('/wallet/withdrawals');
    return response.data;
  },
};

export default walletService;
