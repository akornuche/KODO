<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">My Wallet</h1>
        <p class="text-gray-600 mt-1">Manage your balance and transactions</p>
      </div>

      <!-- Balance Card -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white md:col-span-2">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-sm opacity-90 mb-1">Available Balance</p>
              <p class="text-4xl font-bold">{{ formatCurrency(wallet.balance || 0) }}</p>
            </div>
            <div class="bg-white bg-opacity-20 rounded-lg p-3">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div class="flex gap-4">
            <button @click="showFundModal = true" class="btn bg-white text-blue-600 hover:bg-gray-100">
              + Fund Wallet
            </button>
            <button 
              @click="showWithdrawModal = true" 
              :disabled="!wallet.balance || wallet.balance <= 0"
              class="btn bg-white bg-opacity-20 hover:bg-opacity-30 text-white disabled:opacity-50"
            >
              Withdraw
            </button>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="space-y-4">
          <div class="card bg-green-50 border-green-200">
            <p class="text-sm text-green-700 mb-1">Total Income</p>
            <p class="text-2xl font-bold text-green-900">{{ formatCurrency(stats.totalIncome || 0) }}</p>
          </div>
          <div class="card bg-red-50 border-red-200">
            <p class="text-sm text-red-700 mb-1">Total Spent</p>
            <p class="text-2xl font-bold text-red-900">{{ formatCurrency(stats.totalSpent || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold">Transaction History</h2>
          <select v-model="filterType" @change="loadTransactions" class="input w-48">
            <option value="">All Transactions</option>
            <option value="credit">Credits</option>
            <option value="debit">Debits</option>
            <option value="refund">Refunds</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="space-y-4">
          <div v-for="i in 5" :key="i" class="animate-pulse flex gap-4 p-4 border-b">
            <div class="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div class="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="transactions.length === 0" class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-gray-500">No transactions yet</p>
        </div>

        <!-- Transactions List -->
        <div v-else class="space-y-1">
          <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <!-- Icon -->
            <div
              :class="{
                'bg-green-100 text-green-600': transaction.type === 'credit' || transaction.type === 'refund',
                'bg-red-100 text-red-600': transaction.type === 'debit' || transaction.type === 'withdrawal',
              }"
              class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg v-if="transaction.type === 'credit' || transaction.type === 'refund'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
            </div>

            <!-- Details -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 truncate">
                {{ transaction.description || getTransactionTitle(transaction.type) }}
              </p>
              <p class="text-sm text-gray-500">
                {{ formatDate(transaction.createdAt) }}
              </p>
            </div>

            <!-- Amount -->
            <div class="text-right">
              <p
                :class="{
                  'text-green-600': transaction.type === 'credit' || transaction.type === 'refund',
                  'text-red-600': transaction.type === 'debit' || transaction.type === 'withdrawal',
                }"
                class="font-semibold"
              >
                {{ transaction.type === 'credit' || transaction.type === 'refund' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
              </p>
              <p class="text-xs text-gray-500 capitalize">{{ transaction.type }}</p>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.total > pagination.perPage" class="mt-6 flex justify-center gap-2">
          <button
            @click="loadTransactions(pagination.currentPage - 1)"
            :disabled="pagination.currentPage === 1"
            class="btn btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span class="px-4 py-2 text-sm text-gray-700">
            Page {{ pagination.currentPage }} of {{ Math.ceil(pagination.total / pagination.perPage) }}
          </span>
          <button
            @click="loadTransactions(pagination.currentPage + 1)"
            :disabled="pagination.currentPage >= Math.ceil(pagination.total / pagination.perPage)"
            class="btn btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Fund Wallet Modal -->
    <div v-if="showFundModal" class="modal-overlay" @click.self="showFundModal = false">
      <div class="modal-content max-w-md">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold">Fund Wallet</h3>
          <button @click="showFundModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleFund">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              v-model.number="fundAmount"
              type="number"
              min="100"
              step="100"
              required
              class="input"
              placeholder="Enter amount"
            />
            <p class="text-xs text-gray-500 mt-1">Minimum: ₦100</p>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select v-model="fundMethod" class="input">
              <option value="stripe">Credit/Debit Card</option>
              <option value="flutterwave">Flutterwave</option>
            </select>
          </div>

          <div class="flex gap-3">
            <button type="button" @click="showFundModal = false" class="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" :disabled="fundLoading" class="btn btn-primary flex-1">
              {{ fundLoading ? 'Processing...' : 'Continue' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Withdraw Modal -->
    <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
      <div class="modal-content max-w-md">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold">Withdraw Funds</h3>
          <button @click="showWithdrawModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleWithdraw">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              v-model.number="withdrawAmount"
              type="number"
              :max="wallet.balance"
              min="500"
              step="100"
              required
              class="input"
              placeholder="Enter amount"
            />
            <p class="text-xs text-gray-500 mt-1">
              Available: {{ formatCurrency(wallet.balance) }} | Minimum: ₦500
            </p>
          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p class="text-sm text-yellow-800">
              <strong>Processing Time:</strong> Withdrawals typically take 1-3 business days to reflect in your bank account.
            </p>
          </div>

          <div class="flex gap-3">
            <button type="button" @click="showWithdrawModal = false" class="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" :disabled="withdrawLoading" class="btn btn-primary flex-1">
              {{ withdrawLoading ? 'Processing...' : 'Withdraw' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import walletService from '../services/walletService';
import { formatCurrency, formatDate } from '../utils/helpers';

const wallet = ref({ balance: 0 });
const transactions = ref([]);
const stats = ref({ totalIncome: 0, totalSpent: 0 });
const loading = ref(false);
const filterType = ref('');
const pagination = ref({
  currentPage: 1,
  perPage: 10,
  total: 0,
});

// Modals
const showFundModal = ref(false);
const showWithdrawModal = ref(false);
const fundAmount = ref(1000);
const fundMethod = ref('stripe');
const withdrawAmount = ref(500);
const fundLoading = ref(false);
const withdrawLoading = ref(false);

onMounted(() => {
  loadWallet();
  loadTransactions();
});

async function loadWallet() {
  try {
    const data = await walletService.getWallet();
    wallet.value = data.wallet;
    stats.value = {
      totalIncome: data.totalIncome || 0,
      totalSpent: data.totalSpent || 0,
    };
  } catch (error) {
    console.error('Failed to load wallet:', error);
  }
}

async function loadTransactions(page = 1) {
  loading.value = true;
  try {
    const params = {
      page,
      limit: pagination.value.perPage,
    };
    if (filterType.value) {
      params.type = filterType.value;
    }

    const data = await walletService.getTransactions(params);
    transactions.value = data.transactions;
    pagination.value = {
      currentPage: data.page,
      perPage: data.limit,
      total: data.total,
    };
  } catch (error) {
    console.error('Failed to load transactions:', error);
  } finally {
    loading.value = false;
  }
}

async function handleFund() {
  if (fundAmount.value < 100) {
    alert('Minimum funding amount is ₦100');
    return;
  }

  fundLoading.value = true;
  try {
    const data = await walletService.fundWallet(fundAmount.value, fundMethod.value);
    
    if (data.paymentUrl) {
      // Redirect to payment page
      window.location.href = data.paymentUrl;
    } else {
      showFundModal.value = false;
      loadWallet();
      loadTransactions();
    }
  } catch (error) {
    console.error('Failed to fund wallet:', error);
    alert(error.response?.data?.error || 'Failed to fund wallet. Please try again.');
  } finally {
    fundLoading.value = false;
  }
}

async function handleWithdraw() {
  if (withdrawAmount.value < 500) {
    alert('Minimum withdrawal amount is ₦500');
    return;
  }

  if (withdrawAmount.value > wallet.value.balance) {
    alert('Insufficient balance');
    return;
  }

  withdrawLoading.value = true;
  try {
    await walletService.withdraw(withdrawAmount.value);
    showWithdrawModal.value = false;
    loadWallet();
    loadTransactions();
    alert('Withdrawal request submitted successfully!');
  } catch (error) {
    console.error('Failed to withdraw:', error);
    alert(error.response?.data?.error || 'Failed to process withdrawal. Please try again.');
  } finally {
    withdrawLoading.value = false;
  }
}

function getTransactionTitle(type) {
  const titles = {
    credit: 'Wallet Credit',
    debit: 'Wallet Debit',
    refund: 'Refund',
    withdrawal: 'Withdrawal',
  };
  return titles[type] || 'Transaction';
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
</style>
