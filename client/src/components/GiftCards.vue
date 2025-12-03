<template>
  <div class="gift-cards">
    <div class="cards-header">
      <h1>🎁 Gift Cards</h1>
      <p>Purchase and manage gift cards</p>
    </div>

    <div class="cards-layout">
      <!-- Purchase Gift Card -->
      <div class="card-section">
        <h2>Purchase Gift Card</h2>
        <div class="purchase-card">
          <div class="gift-card-preview" :style="{ background: selectedDesign.gradient }">
            <div class="card-content">
              <h3>{{ selectedDesign.name }}</h3>
              <div class="card-amount">${{ purchaseForm.amount || '0.00' }}</div>
              <p class="card-message" v-if="purchaseForm.message">
                "{{ purchaseForm.message }}"
              </p>
            </div>
          </div>

          <form @submit.prevent="purchaseGiftCard" class="purchase-form">
            <div class="form-group">
              <label>Amount</label>
              <select v-model.number="purchaseForm.amount" required>
                <option :value="25">$25</option>
                <option :value="50">$50</option>
                <option :value="100">$100</option>
                <option :value="200">$200</option>
              </select>
            </div>

            <div class="form-group">
              <label>Design</label>
              <div class="design-selector">
                <div
                  v-for="design in designs"
                  :key="design.id"
                  class="design-option"
                  :class="{ selected: selectedDesign.id === design.id }"
                  :style="{ background: design.gradient }"
                  @click="selectedDesign = design"
                >
                  {{ design.name }}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Recipient Email (Optional)</label>
              <input type="email" v-model="purchaseForm.recipientEmail" />
            </div>

            <div class="form-group">
              <label>Personal Message (Optional)</label>
              <textarea
                v-model="purchaseForm.message"
                maxlength="200"
                rows="3"
              ></textarea>
            </div>

            <button type="submit" class="btn btn-primary">
              🛒 Purchase Gift Card
            </button>
          </form>
        </div>
      </div>

      <!-- My Gift Cards -->
      <div class="card-section">
        <h2>My Gift Cards</h2>
        <div v-if="myCards.length" class="cards-list">
          <div
            v-for="card in myCards"
            :key="card.id"
            class="gift-card-item"
            :style="{ background: getCardGradient(card.design) }"
          >
            <div class="card-info">
              <div class="card-code">{{ card.code }}</div>
              <div class="card-balance">${{ card.balance }}</div>
              <div class="card-meta">
                <span v-if="card.expiresAt">
                  Expires: {{ formatDate(card.expiresAt) }}
                </span>
                <span v-else>No expiration</span>
              </div>
            </div>
            <button @click="copyCode(card.code)" class="btn-copy">
              📋 Copy
            </button>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>No gift cards yet</p>
        </div>
      </div>

      <!-- Check Balance -->
      <div class="card-section">
        <h2>Check Balance</h2>
        <div class="balance-checker">
          <div class="form-group">
            <input
              type="text"
              v-model="balanceCode"
              placeholder="Enter gift card code"
            />
          </div>
          <button @click="checkBalance" class="btn btn-primary">
            🔍 Check Balance
          </button>

          <div v-if="balanceResult" class="balance-result">
            <div class="result-amount">${{ balanceResult.balance }}</div>
            <p v-if="balanceResult.expiresAt">
              Expires: {{ formatDate(balanceResult.expiresAt) }}
            </p>
            <p v-else>No expiration</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { enhancedFeaturesService } from '@/services/enhancedFeaturesService';
import { useToast } from 'vue-toastification';

const toast = useToast();

const designs = [
  { id: 1, name: 'Birthday', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 2, name: 'Holiday', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 3, name: 'Celebration', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 4, name: 'Thank You', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
];

const selectedDesign = ref(designs[0]);
const purchaseForm = ref({
  amount: 50,
  recipientEmail: '',
  message: '',
});

const myCards = ref([]);
const balanceCode = ref('');
const balanceResult = ref(null);

const getCardGradient = (design) => {
  const found = designs.find((d) => d.name === design);
  return found ? found.gradient : designs[0].gradient;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const purchaseGiftCard = async () => {
  try {
    const data = {
      amount: purchaseForm.value.amount,
      design: selectedDesign.value.name,
      recipientEmail: purchaseForm.value.recipientEmail || undefined,
      message: purchaseForm.value.message || undefined,
    };

    await enhancedFeaturesService.giftCardService.create(data);
    toast.success('Gift card purchased successfully!');
    
    // Reset form
    purchaseForm.value = { amount: 50, recipientEmail: '', message: '' };
    loadMyCards();
  } catch (error) {
    console.error('Error purchasing gift card:', error);
    toast.error('Failed to purchase gift card');
  }
};

const loadMyCards = async () => {
  try {
    const data = await enhancedFeaturesService.giftCardService.getMyCards();
    myCards.value = data;
  } catch (error) {
    console.error('Error loading gift cards:', error);
  }
};

const checkBalance = async () => {
  if (!balanceCode.value) {
    toast.error('Please enter a gift card code');
    return;
  }

  try {
    const data = await enhancedFeaturesService.giftCardService.checkBalance(
      balanceCode.value
    );
    balanceResult.value = data;
  } catch (error) {
    console.error('Error checking balance:', error);
    toast.error('Invalid gift card code');
    balanceResult.value = null;
  }
};

const copyCode = (code) => {
  navigator.clipboard.writeText(code);
  toast.success('Gift card code copied!');
};

onMounted(() => {
  loadMyCards();
});
</script>

<style scoped>
.gift-cards {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.cards-header {
  text-align: center;
  margin-bottom: 3rem;
}

.cards-layout {
  display: grid;
  gap: 2rem;
}

.card-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-section h2 {
  margin-bottom: 1.5rem;
}

.purchase-card {
  display: grid;
  gap: 2rem;
}

.gift-card-preview {
  border-radius: 16px;
  padding: 2rem;
  color: white;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.card-content {
  text-align: center;
}

.card-amount {
  font-size: 3rem;
  font-weight: 700;
  margin: 1rem 0;
}

.card-message {
  font-style: italic;
  opacity: 0.9;
  margin-top: 1rem;
}

.purchase-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.design-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.design-option {
  padding: 1.5rem;
  border-radius: 8px;
  color: white;
  text-align: center;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.design-option:hover {
  transform: scale(1.05);
}

.design-option.selected {
  border-color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.gift-card-item {
  border-radius: 12px;
  padding: 1.5rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.card-code {
  font-family: monospace;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card-balance {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card-meta {
  font-size: 0.875rem;
  opacity: 0.9;
}

.btn-copy {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: white;
  color: #333;
}

.balance-checker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.balance-result {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  margin-top: 1rem;
}

.result-amount {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style>
