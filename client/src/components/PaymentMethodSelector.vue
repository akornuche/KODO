<template>
  <div class="payment-method-selector">
    <h3>Payment Method</h3>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading payment methods...</p>
    </div>

    <div v-else class="payment-options">
      <!-- Saved Payment Methods -->
      <div v-if="savedMethods.length > 0" class="saved-methods">
        <h4>Saved Payment Methods</h4>
        <div class="methods-list">
          <div 
            v-for="method in savedMethods" 
            :key="method.id"
            :class="['method-card', { selected: selectedMethod?.id === method.id }]"
            @click="selectMethod(method)"
          >
            <div class="method-icon">
              <svg v-if="method.type === 'card'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <svg v-else-if="method.type === 'bank'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="16" y1="13" x2="16" y2="21"/>
                <line x1="8" y1="13" x2="8" y2="21"/>
                <line x1="12" y1="15" x2="12" y2="23"/>
                <path d="M20 21h1a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1h1"/>
                <path d="M3 10h18"/>
                <path d="M2 6l10-4 10 4"/>
              </svg>
            </div>
            
            <div class="method-details">
              <div class="method-name">
                <strong>{{ method.brand || method.bankName }}</strong>
                <span v-if="method.isDefault" class="default-badge">Default</span>
              </div>
              <p class="method-info">
                <span v-if="method.type === 'card'">•••• {{ method.last4 }}</span>
                <span v-else>Account {{ method.accountNumber }}</span>
                <span class="method-expiry" v-if="method.expiryDate">
                  Expires {{ method.expiryDate }}
                </span>
              </p>
            </div>

            <div class="method-actions">
              <button 
                v-if="selectedMethod?.id === method.id"
                class="checkmark"
                aria-label="Selected"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              <button 
                @click.stop="removeMethod(method.id)"
                class="btn-remove"
                aria-label="Remove payment method"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add New Payment Method -->
      <div class="add-new-method">
        <h4>Add New Payment Method</h4>
        
        <div class="payment-provider-tabs">
          <button 
            @click="activeProvider = 'stripe'"
            :class="['provider-tab', { active: activeProvider === 'stripe' }]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
            </svg>
            Stripe
          </button>
          <button 
            @click="activeProvider = 'flutterwave'"
            :class="['provider-tab', { active: activeProvider === 'flutterwave' }]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.87 3.42L3.43 8.87c-.49.49-.42 1.28.14 1.73l14.27 11.29c.56.44 1.37.37 1.86-.13l5.44-5.44c.49-.49.57-1.3.13-1.86L14.16 3.56c-.44-.56-1.24-.63-1.73-.14L8.87 3.42z"/>
            </svg>
            Flutterwave
          </button>
        </div>

        <!-- Stripe Card Form -->
        <div v-if="activeProvider === 'stripe'" class="payment-form stripe-form">
          <div class="form-group">
            <label>Card Number</label>
            <div id="stripe-card-number" class="stripe-element"></div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Expiry Date</label>
              <div id="stripe-card-expiry" class="stripe-element"></div>
            </div>
            <div class="form-group">
              <label>CVC</label>
              <div id="stripe-card-cvc" class="stripe-element"></div>
            </div>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" v-model="saveForFuture" />
              Save this card for future purchases
            </label>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" v-model="setAsDefault" :disabled="!saveForFuture" />
              Set as default payment method
            </label>
          </div>
        </div>

        <!-- Flutterwave Options -->
        <div v-else-if="activeProvider === 'flutterwave'" class="payment-form flutterwave-form">
          <div class="flutterwave-options">
            <button 
              @click="selectFlutterwaveMethod('card')"
              :class="['fw-option', { selected: flutterwaveMethod === 'card' }]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <span>Card Payment</span>
            </button>

            <button 
              @click="selectFlutterwaveMethod('bank')"
              :class="['fw-option', { selected: flutterwaveMethod === 'bank' }]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="16" y1="13" x2="16" y2="21"/>
                <line x1="8" y1="13" x2="8" y2="21"/>
                <line x1="12" y1="15" x2="12" y2="23"/>
                <path d="M20 21h1a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1h1"/>
                <path d="M3 10h18"/>
                <path d="M2 6l10-4 10 4"/>
              </svg>
              <span>Bank Transfer</span>
            </button>

            <button 
              @click="selectFlutterwaveMethod('mobilemoney')"
              :class="['fw-option', { selected: flutterwaveMethod === 'mobilemoney' }]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              <span>Mobile Money</span>
            </button>

            <button 
              @click="selectFlutterwaveMethod('ussd')"
              :class="['fw-option', { selected: flutterwaveMethod === 'ussd' }]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>USSD</span>
            </button>
          </div>

          <p class="fw-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            You'll be redirected to Flutterwave to complete your payment securely
          </p>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button 
        @click="$emit('cancel')" 
        class="btn-secondary"
      >
        Cancel
      </button>
      <button 
        @click="proceedWithPayment"
        :disabled="!canProceed || processing"
        class="btn-primary"
      >
        {{ processing ? 'Processing...' : `Pay ${formatAmount(amount)}` }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import api from '../services/api';

export default {
  name: 'PaymentMethodSelector',
  
  props: {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },

  emits: ['payment-success', 'payment-error', 'cancel'],

  setup(props, { emit }) {
    const loading = ref(false);
    const processing = ref(false);
    const savedMethods = ref([]);
    const selectedMethod = ref(null);
    const activeProvider = ref('stripe');
    const flutterwaveMethod = ref('card');
    const saveForFuture = ref(false);
    const setAsDefault = ref(false);

    // Stripe Elements
    let stripe = null;
    let cardNumber = null;
    let cardExpiry = null;
    let cardCvc = null;

    const canProceed = computed(() => {
      if (selectedMethod.value) return true;
      if (activeProvider.value === 'stripe') {
        // Check if Stripe elements are valid (simplified)
        return true;
      }
      if (activeProvider.value === 'flutterwave') {
        return flutterwaveMethod.value !== null;
      }
      return false;
    });

    const fetchSavedMethods = async () => {
      loading.value = true;
      try {
        const response = await api.get('/payments/methods');
        savedMethods.value = response.data.methods || [];
        
        // Auto-select default method
        const defaultMethod = savedMethods.value.find(m => m.isDefault);
        if (defaultMethod) {
          selectedMethod.value = defaultMethod;
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error);
      } finally {
        loading.value = false;
      }
    };

    const initializeStripe = () => {
      if (typeof window.Stripe === 'undefined') {
        console.error('Stripe.js not loaded');
        return;
      }

      stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
      const elements = stripe.elements();

      const elementStyles = {
        base: {
          fontSize: '16px',
          color: '#32325d',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a',
        },
      };

      cardNumber = elements.create('cardNumber', { style: elementStyles });
      cardExpiry = elements.create('cardExpiry', { style: elementStyles });
      cardCvc = elements.create('cardCvc', { style: elementStyles });

      // Mount elements after a short delay to ensure DOM is ready
      setTimeout(() => {
        const numberEl = document.getElementById('stripe-card-number');
        const expiryEl = document.getElementById('stripe-card-expiry');
        const cvcEl = document.getElementById('stripe-card-cvc');

        if (numberEl) cardNumber.mount('#stripe-card-number');
        if (expiryEl) cardExpiry.mount('#stripe-card-expiry');
        if (cvcEl) cardCvc.mount('#stripe-card-cvc');
      }, 100);
    };

    const selectMethod = (method) => {
      selectedMethod.value = method;
    };

    const selectFlutterwaveMethod = (method) => {
      flutterwaveMethod.value = method;
    };

    const removeMethod = async (methodId) => {
      if (!confirm('Are you sure you want to remove this payment method?')) {
        return;
      }

      try {
        await api.delete(`/payments/methods/${methodId}`);
        savedMethods.value = savedMethods.value.filter(m => m.id !== methodId);
        if (selectedMethod.value?.id === methodId) {
          selectedMethod.value = null;
        }
      } catch (error) {
        console.error('Failed to remove payment method:', error);
        alert('Failed to remove payment method. Please try again.');
      }
    };

    const proceedWithPayment = async () => {
      processing.value = true;
      
      try {
        if (selectedMethod.value) {
          // Use saved payment method
          await processWithSavedMethod();
        } else if (activeProvider.value === 'stripe') {
          await processStripePayment();
        } else if (activeProvider.value === 'flutterwave') {
          await processFlutterwavePayment();
        }
      } catch (error) {
        console.error('Payment failed:', error);
        emit('payment-error', error);
      } finally {
        processing.value = false;
      }
    };

    const processWithSavedMethod = async () => {
      const response = await api.post('/payments/charge', {
        paymentMethodId: selectedMethod.value.id,
        amount: props.amount,
        currency: props.currency,
      });

      if (response.data.success) {
        emit('payment-success', response.data);
      } else {
        throw new Error(response.data.message || 'Payment failed');
      }
    };

    const processStripePayment = async () => {
      // Create payment method
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumber,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Process payment
      const response = await api.post('/payments/stripe/charge', {
        paymentMethodId: paymentMethod.id,
        amount: props.amount,
        currency: props.currency,
        saveForFuture: saveForFuture.value,
        setAsDefault: setAsDefault.value,
      });

      if (response.data.requiresAction) {
        // Handle 3D Secure
        const { error: confirmError } = await stripe.confirmCardPayment(
          response.data.clientSecret
        );
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      emit('payment-success', response.data);
    };

    const processFlutterwavePayment = async () => {
      const response = await api.post('/payments/flutterwave/initialize', {
        amount: props.amount,
        currency: props.currency,
        paymentMethod: flutterwaveMethod.value,
      });

      if (response.data.link) {
        // Redirect to Flutterwave
        window.location.href = response.data.link;
      } else {
        throw new Error('Failed to initialize Flutterwave payment');
      }
    };

    const formatAmount = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: props.currency,
      }).format(amount);
    };

    onMounted(() => {
      fetchSavedMethods();
      if (activeProvider.value === 'stripe') {
        initializeStripe();
      }
    });

    onBeforeUnmount(() => {
      // Cleanup Stripe elements
      if (cardNumber) cardNumber.destroy();
      if (cardExpiry) cardExpiry.destroy();
      if (cardCvc) cardCvc.destroy();
    });

    return {
      loading,
      processing,
      savedMethods,
      selectedMethod,
      activeProvider,
      flutterwaveMethod,
      saveForFuture,
      setAsDefault,
      canProceed,
      selectMethod,
      selectFlutterwaveMethod,
      removeMethod,
      proceedWithPayment,
      formatAmount,
    };
  },
};
</script>

<style scoped>
.payment-method-selector {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 700px;
  margin: 0 auto;
}

.payment-method-selector h3 {
  margin: 0 0 25px 0;
  font-size: 24px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.saved-methods {
  margin-bottom: 30px;
}

.saved-methods h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #6c757d;
}

.methods-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.method-card:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.method-card.selected {
  border-color: #007bff;
  background: #e7f3ff;
}

.method-icon {
  color: #007bff;
  flex-shrink: 0;
}

.method-details {
  flex: 1;
}

.method-name {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.method-name strong {
  font-size: 16px;
  text-transform: capitalize;
}

.default-badge {
  padding: 2px 8px;
  background: #28a745;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.method-info {
  margin: 0;
  font-size: 14px;
  color: #6c757d;
  display: flex;
  gap: 15px;
}

.method-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkmark {
  width: 28px;
  height: 28px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.btn-remove {
  width: 28px;
  height: 28px;
  background: none;
  color: #dc3545;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}

.btn-remove:hover {
  background: #fff5f5;
}

.add-new-method h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #6c757d;
}

.payment-provider-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.provider-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.provider-tab:hover {
  border-color: #007bff;
}

.provider-tab.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.payment-form {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.form-group input[type="checkbox"] {
  margin-right: 8px;
}

.stripe-element {
  padding: 12px;
  background: white;
  border: 1px solid #ced4da;
  border-radius: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 15px;
}

.flutterwave-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.fw-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.fw-option:hover {
  border-color: #007bff;
}

.fw-option.selected {
  border-color: #007bff;
  background: #e7f3ff;
  color: #007bff;
}

.fw-option span {
  font-weight: 600;
  font-size: 14px;
}

.fw-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  font-size: 13px;
  color: #856404;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.btn-primary,
.btn-secondary {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .payment-method-selector {
    padding: 20px;
  }

  .payment-provider-tabs {
    flex-direction: column;
  }

  .flutterwave-options {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
