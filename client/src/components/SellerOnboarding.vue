<template>
  <div class="seller-onboarding">
    <div class="onboarding-header">
      <h1>Seller Onboarding</h1>
      <p>Complete these steps to start selling on KODO</p>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar">
      <div
        v-for="step in steps"
        :key="step.step"
        :class="['progress-step', {
          completed: step.completed,
          active: currentStep === step.step,
        }]"
      >
        <div class="step-number">
          <span v-if="step.completed">✓</span>
          <span v-else>{{ step.step }}</span>
        </div>
        <div class="step-info">
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="step-content">
      <!-- Step 1: Select Niche -->
      <div v-if="currentStep === 1" class="step-form">
        <h2>Select Your Niche</h2>
        <p class="step-description">
          Choose the primary category you'll sell in. You'll be restricted to this niche
          to maintain quality and specialization.
        </p>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading niches...</p>
        </div>

        <div v-else class="niches-grid">
          <div
            v-for="niche in niches"
            :key="niche.value"
            :class="['niche-card', { selected: form.niche === niche.value }]"
            @click="selectNiche(niche)"
          >
            <div class="niche-icon">
              {{ getNicheIcon(niche.value) }}
            </div>
            <h3>{{ niche.label }}</h3>
            <p>{{ niche.subcategories.length }} subcategories</p>
          </div>
        </div>

        <!-- Subcategories -->
        <div v-if="form.niche && selectedNicheData" class="subcategories-section">
          <h3>Select Subcategories (Optional)</h3>
          <p>Choose specific subcategories within {{ form.niche }}</p>
          
          <div class="subcategories-list">
            <label
              v-for="subcategory in selectedNicheData.subcategories"
              :key="subcategory"
              class="subcategory-checkbox"
            >
              <input
                type="checkbox"
                :value="subcategory"
                v-model="form.subcategories"
              />
              <span>{{ subcategory }}</span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button @click="saveNiche" :disabled="!form.niche || saving" class="btn-primary">
            {{ saving ? 'Saving...' : 'Next: Business Information' }}
          </button>
        </div>
      </div>

      <!-- Step 2: Business Information -->
      <div v-if="currentStep === 2" class="step-form">
        <h2>Business Information</h2>
        <p class="step-description">
          Tell customers about your business. This will be displayed on your seller profile.
        </p>

        <div class="form-group">
          <label>Business/Shop Name *</label>
          <input
            v-model="form.businessName"
            type="text"
            placeholder="e.g., Tech World Store"
            maxlength="100"
            required
          />
        </div>

        <div class="form-group">
          <label>Business Description *</label>
          <textarea
            v-model="form.businessDescription"
            placeholder="Describe your business, what you sell, and what makes you unique..."
            rows="6"
            maxlength="500"
            required
          ></textarea>
          <span class="char-count">{{ form.businessDescription?.length || 0 }}/500</span>
        </div>

        <div class="form-group">
          <label>Business Logo (Optional)</label>
          <input
            type="file"
            accept="image/*"
            @change="handleLogoUpload"
          />
          <p class="field-hint">Recommended size: 300x300px, max 2MB</p>
          
          <div v-if="form.businessLogo" class="logo-preview">
            <img :src="form.businessLogo" alt="Business Logo" />
            <button @click="form.businessLogo = null" class="btn-remove-logo">Remove</button>
          </div>
        </div>

        <div class="form-actions">
          <button @click="currentStep = 1" class="btn-secondary">Back</button>
          <button
            @click="saveBusinessInfo"
            :disabled="!form.businessName || !form.businessDescription || saving"
            class="btn-primary"
          >
            {{ saving ? 'Saving...' : 'Next: Payment Setup' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Payment Setup -->
      <div v-if="currentStep === 3" class="step-form">
        <h2>Payment Setup</h2>
        <p class="step-description">
          Configure how you'll receive payments from sales. We use Flutterwave for secure bank transfers.
        </p>

        <div class="form-group">
          <label>Bank Name *</label>
          <select v-model="form.bankName" required>
            <option value="">Select your bank</option>
            <option v-for="bank in nigerianBanks" :key="bank.code" :value="bank.name">
              {{ bank.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Account Number *</label>
          <input
            v-model="form.accountNumber"
            type="text"
            placeholder="0123456789"
            maxlength="10"
            pattern="[0-9]{10}"
            required
          />
          <p class="field-hint">Enter your 10-digit account number</p>
        </div>

        <div class="form-group">
          <label>Account Name *</label>
          <input
            v-model="form.accountName"
            type="text"
            placeholder="John Doe"
            required
          />
          <p class="field-hint">Must match your bank account name</p>
        </div>

        <div class="payment-security-notice">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div>
            <h4>Your payment information is secure</h4>
            <p>We use bank-level encryption and never store sensitive payment details.</p>
          </div>
        </div>

        <div class="form-actions">
          <button @click="currentStep = 2" class="btn-secondary">Back</button>
          <button
            @click="savePaymentInfo"
            :disabled="!form.bankName || !form.accountNumber || !form.accountName || saving"
            class="btn-primary"
          >
            {{ saving ? 'Saving...' : 'Next: Verification' }}
          </button>
        </div>
      </div>

      <!-- Step 4: Verification -->
      <div v-if="currentStep === 4" class="step-form">
        <h2>Verification</h2>
        <p class="step-description">
          Verify your email and phone number to complete onboarding.
        </p>

        <div class="verification-status">
          <div class="verification-item">
            <div class="verification-icon">
              <svg v-if="user.verified" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="verification-details">
              <h4>Email Verification</h4>
              <p v-if="user.verified">✓ Email verified</p>
              <p v-else>Check your email for verification link</p>
            </div>
            <button v-if="!user.verified" @click="resendVerificationEmail" class="btn-verify">
              Resend Email
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button @click="currentStep = 3" class="btn-secondary">Back</button>
          <button
            @click="completeOnboarding"
            :disabled="!user.verified || saving"
            class="btn-primary"
          >
            {{ saving ? 'Completing...' : 'Complete Onboarding' }}
          </button>
        </div>
      </div>

      <!-- Completion Success -->
      <div v-if="onboardingComplete" class="completion-screen">
        <div class="success-animation">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2>🎉 Onboarding Complete!</h2>
        <p>You're all set to start selling on KODO.</p>
        <div class="completion-actions">
          <button @click="$router.push('/seller/dashboard')" class="btn-primary">
            Go to Dashboard
          </button>
          <button @click="$router.push('/products/create')" class="btn-secondary">
            Create First Product
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

export default {
  name: 'SellerOnboarding',

  setup() {
    const router = useRouter();
    
    const loading = ref(false);
    const saving = ref(false);
    const currentStep = ref(1);
    const onboardingComplete = ref(false);
    
    const niches = ref([]);
    const steps = ref([]);
    const user = ref({});
    
    const form = ref({
      niche: '',
      subcategories: [],
      businessName: '',
      businessDescription: '',
      businessLogo: null,
      bankName: '',
      accountNumber: '',
      accountName: '',
    });

    const nigerianBanks = [
      { code: '044', name: 'Access Bank' },
      { code: '063', name: 'Diamond Bank' },
      { code: '050', name: 'Ecobank Nigeria' },
      { code: '214', name: 'FCMB' },
      { code: '070', name: 'Fidelity Bank' },
      { code: '011', name: 'First Bank' },
      { code: '058', name: 'GTBank' },
      { code: '030', name: 'Heritage Bank' },
      { code: '301', name: 'Jaiz Bank' },
      { code: '082', name: 'Keystone Bank' },
      { code: '526', name: 'Parallex Bank' },
      { code: '101', name: 'Providus Bank' },
      { code: '076', name: 'Polaris Bank' },
      { code: '221', name: 'Stanbic IBTC' },
      { code: '068', name: 'Standard Chartered' },
      { code: '232', name: 'Sterling Bank' },
      { code: '100', name: 'Suntrust Bank' },
      { code: '032', name: 'Union Bank' },
      { code: '033', name: 'UBA' },
      { code: '215', name: 'Unity Bank' },
      { code: '035', name: 'Wema Bank' },
      { code: '057', name: 'Zenith Bank' },
    ];

    const selectedNicheData = computed(() => {
      return niches.value.find(n => n.value === form.value.niche);
    });

    const fetchOnboardingStatus = async () => {
      loading.value = true;
      try {
        const response = await api.get('/seller-onboarding/status');
        steps.value = response.data.steps;
        currentStep.value = response.data.currentStep;
        user.value = response.data.user;
        onboardingComplete.value = response.data.isComplete;
        
        // Pre-fill form if data exists
        if (user.value.sellerNiche) {
          form.value.niche = user.value.sellerNiche;
        }
      } catch (error) {
        console.error('Failed to fetch onboarding status:', error);
      } finally {
        loading.value = false;
      }
    };

    const fetchNiches = async () => {
      try {
        const response = await api.get('/seller-onboarding/niches');
        niches.value = response.data.niches;
      } catch (error) {
        console.error('Failed to fetch niches:', error);
      }
    };

    const selectNiche = (niche) => {
      form.value.niche = niche.value;
      form.value.subcategories = [];
    };

    const saveNiche = async () => {
      saving.value = true;
      try {
        await api.put('/seller-onboarding/niche', {
          sellerNiche: form.value.niche,
          subcategories: form.value.subcategories,
        });
        
        currentStep.value = 2;
        await fetchOnboardingStatus();
      } catch (error) {
        console.error('Failed to save niche:', error);
        alert('Failed to save niche. Please try again.');
      } finally {
        saving.value = false;
      }
    };

    const saveBusinessInfo = async () => {
      if (form.value.businessDescription.length < 20) {
        alert('Business description must be at least 20 characters');
        return;
      }

      saving.value = true;
      try {
        await api.put('/seller-onboarding/business', {
          businessName: form.value.businessName,
          businessDescription: form.value.businessDescription,
          businessLogo: form.value.businessLogo,
        });
        
        currentStep.value = 3;
        await fetchOnboardingStatus();
      } catch (error) {
        console.error('Failed to save business info:', error);
        alert('Failed to save business information. Please try again.');
      } finally {
        saving.value = false;
      }
    };

    const savePaymentInfo = async () => {
      if (form.value.accountNumber.length !== 10) {
        alert('Account number must be 10 digits');
        return;
      }

      saving.value = true;
      try {
        await api.put('/seller-onboarding/payment', {
          bankName: form.value.bankName,
          accountNumber: form.value.accountNumber,
          accountName: form.value.accountName,
        });
        
        currentStep.value = 4;
        await fetchOnboardingStatus();
      } catch (error) {
        console.error('Failed to save payment info:', error);
        alert('Failed to save payment information. Please try again.');
      } finally {
        saving.value = false;
      }
    };

    const completeOnboarding = async () => {
      saving.value = true;
      try {
        // Complete seller-specific onboarding
        await api.post('/seller-onboarding/complete');
        
        // Update general onboarding status
        await api.post('/onboarding/complete', { role: 'seller' });
        
        onboardingComplete.value = true;
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
        alert(error.response?.data?.message || 'Failed to complete onboarding');
      } finally {
        saving.value = false;
      }
    };

    const handleLogoUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }

      // In production, upload to cloud storage
      const reader = new FileReader();
      reader.onload = (e) => {
        form.value.businessLogo = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    const resendVerificationEmail = async () => {
      try {
        await api.post('/auth/resend-verification');
        alert('Verification email sent! Please check your inbox.');
      } catch (error) {
        console.error('Failed to resend verification:', error);
        alert('Failed to resend verification email');
      }
    };

    const getNicheIcon = (niche) => {
      const icons = {
        Electronics: '💻',
        Fashion: '👗',
        'Home & Garden': '🏡',
        'Sports & Outdoors': '⚽',
        'Books & Media': '📚',
        'Toys & Games': '🎮',
        'Health & Beauty': '💄',
        Automotive: '🚗',
        'Food & Beverages': '🍕',
        'Jewelry & Accessories': '💍',
        'Art & Collectibles': '🎨',
        'Pet Supplies': '🐾',
        'Office Supplies': '📎',
        'Baby & Kids': '👶',
        Other: '📦',
      };
      return icons[niche] || '📦';
    };

    onMounted(() => {
      fetchOnboardingStatus();
      fetchNiches();
    });

    return {
      loading,
      saving,
      currentStep,
      onboardingComplete,
      niches,
      steps,
      user,
      form,
      nigerianBanks,
      selectedNicheData,
      selectNiche,
      saveNiche,
      saveBusinessInfo,
      savePaymentInfo,
      completeOnboarding,
      handleLogoUpload,
      resendVerificationEmail,
      getNicheIcon,
    };
  },
};
</script>

<style scoped>
.seller-onboarding {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
}

.onboarding-header {
  text-align: center;
  margin-bottom: 40px;
}

.onboarding-header h1 {
  margin: 0 0 10px 0;
  font-size: 32px;
}

.onboarding-header p {
  margin: 0;
  color: #6c757d;
  font-size: 16px;
}

.progress-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 50px;
}

.progress-step {
  position: relative;
}

.progress-step::after {
  content: '';
  position: absolute;
  top: 20px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e9ecef;
  z-index: 0;
}

.progress-step:last-child::after {
  display: none;
}

.progress-step.completed::after {
  background: #28a745;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  font-weight: 700;
  position: relative;
  z-index: 1;
}

.progress-step.completed .step-number {
  background: #28a745;
  color: white;
}

.progress-step.active .step-number {
  background: #007bff;
  color: white;
}

.step-info {
  text-align: center;
}

.step-info h3 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.step-info p {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

.step-content {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.step-form h2 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.step-description {
  margin: 0 0 30px 0;
  color: #6c757d;
  line-height: 1.6;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.niches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.niche-card {
  padding: 20px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.niche-card:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.niche-card.selected {
  border-color: #007bff;
  background: #e7f3ff;
}

.niche-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.niche-card h3 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.niche-card p {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

.subcategories-section {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.subcategories-section h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.subcategories-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.subcategory-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
}

.subcategory-checkbox input {
  cursor: pointer;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #6c757d;
  margin-top: 5px;
}

.field-hint {
  margin: 5px 0 0 0;
  font-size: 12px;
  color: #6c757d;
}

.logo-preview {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.logo-preview img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #e9ecef;
}

.btn-remove-logo {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.payment-security-notice {
  display: flex;
  gap: 15px;
  padding: 20px;
  background: #e7f3ff;
  border: 1px solid #b3d9ff;
  border-radius: 8px;
  margin: 20px 0;
}

.payment-security-notice svg {
  color: #007bff;
  flex-shrink: 0;
}

.payment-security-notice h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
}

.payment-security-notice p {
  margin: 0;
  font-size: 14px;
  color: #495057;
}

.verification-status {
  margin: 30px 0;
}

.verification-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.verification-icon svg {
  width: 40px;
  height: 40px;
  color: #28a745;
}

.verification-details {
  flex: 1;
}

.verification-details h4 {
  margin: 0 0 5px 0;
}

.verification-details p {
  margin: 0;
  color: #6c757d;
}

.btn-verify {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.form-actions {
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

.completion-screen {
  text-align: center;
  padding: 60px 20px;
}

.success-animation {
  margin-bottom: 30px;
}

.success-animation svg {
  color: #28a745;
  animation: checkmark 0.5s ease-in-out;
}

@keyframes checkmark {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.completion-screen h2 {
  margin: 0 0 15px 0;
  font-size: 32px;
}

.completion-screen p {
  margin: 0 0 30px 0;
  color: #6c757d;
  font-size: 18px;
}

.completion-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

@media (max-width: 768px) {
  .progress-bar {
    grid-template-columns: 1fr;
  }

  .progress-step::after {
    display: none;
  }

  .niches-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .subcategories-list {
    grid-template-columns: 1fr;
  }

  .completion-actions {
    flex-direction: column;
  }
}
</style>
