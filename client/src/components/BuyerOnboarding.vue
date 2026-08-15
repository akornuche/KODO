<template>
  <div class="buyer-onboarding">
    <div class="onboarding-header">
      <h1>Welcome to KODO! 👋</h1>
      <p>Let's set up your account to start shopping</p>
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
      <!-- Step 1: Personal Information -->
      <div v-if="currentStep === 1" class="step-form">
        <h2>Personal Information</h2>
        <p class="step-description">
          Let's get to know you better. This information helps us personalize your shopping experience.
        </p>

        <div class="form-group">
          <label>First Name *</label>
          <input
            v-model="form.firstName"
            type="text"
            placeholder="Enter your first name"
            required
          />
        </div>

        <div class="form-group">
          <label>Last Name *</label>
          <input
            v-model="form.lastName"
            type="text"
            placeholder="Enter your last name"
            required
          />
        </div>

        <div class="form-group">
          <label>Phone Number *</label>
          <input
            v-model="form.phoneNumber"
            type="tel"
            placeholder="e.g., 08012345678"
            pattern="[0-9]{11}"
            maxlength="11"
            required
          />
          <p class="field-hint">Enter your 11-digit Nigerian phone number</p>
        </div>

        <div class="form-group">
          <label>Shopping Interests (Optional)</label>
          <p class="field-hint">Select categories you're interested in for personalized recommendations</p>
          <div class="interests-grid">
            <label
              v-for="interest in availableInterests"
              :key="interest.value"
              class="interest-checkbox"
            >
              <input
                type="checkbox"
                :value="interest.value"
                v-model="form.shoppingInterests"
              />
              <span class="interest-label">
                <span class="interest-icon">{{ interest.icon }}</span>
                {{ interest.label }}
              </span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button
            @click="savePersonalInfo"
            :disabled="!form.firstName || !form.lastName || !form.phoneNumber || saving"
            class="btn-primary"
          >
            {{ saving ? 'Saving...' : 'Next: Delivery Addresses' }}
          </button>
        </div>
      </div>

      <!-- Step 2: Delivery Addresses -->
      <div v-if="currentStep === 2" class="step-form">
        <h2>Delivery Addresses</h2>
        <p class="step-description">
          Add your delivery addresses. You can add multiple addresses and set a default.
        </p>

        <!-- Address List -->
        <div v-if="addresses.length > 0" class="addresses-list">
          <div
            v-for="(address, index) in addresses"
            :key="address.id || index"
            class="address-card"
          >
            <div class="address-header">
              <h4>{{ address.label }}</h4>
              <div class="address-actions">
                <button
                  v-if="!address.isDefault"
                  @click="setDefaultAddress(address.id)"
                  class="btn-text"
                  title="Set as default"
                >
                  Set Default
                </button>
                <span v-else class="default-badge">Default</span>
                <button @click="editAddress(address)" class="btn-icon" title="Edit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button @click="deleteAddress(address.id)" class="btn-icon btn-danger" title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
            <p class="address-text">{{ formatAddress(address) }}</p>
            <div v-if="address.landmark" class="address-landmark">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {{ address.landmark }}
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <p>No addresses added yet</p>
        </div>

        <!-- Add/Edit Address Form -->
        <div v-if="showAddressForm" class="address-form">
          <h3>{{ editingAddress ? 'Edit Address' : 'Add New Address' }}</h3>

          <div class="form-group">
            <label>Address Label *</label>
            <input
              v-model="addressForm.label"
              type="text"
              placeholder="e.g., Home, Office"
              required
            />
          </div>

          <div class="form-group">
            <label>Street Address *</label>
            <input
              v-model="addressForm.street"
              type="text"
              placeholder="Enter street address"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>City *</label>
              <input
                v-model="addressForm.city"
                type="text"
                placeholder="e.g., Lagos"
                required
              />
            </div>

            <div class="form-group">
              <label>State *</label>
              <select v-model="addressForm.state" required>
                <option value="">Select State</option>
                <option v-for="state in nigerianStates" :key="state" :value="state">
                  {{ state }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>LGA (Local Government Area) *</label>
              <input
                v-model="addressForm.lga"
                type="text"
                placeholder="Enter LGA"
                required
              />
            </div>

            <div class="form-group">
              <label>Postal Code (Optional)</label>
              <input
                v-model="addressForm.postalCode"
                type="text"
                placeholder="e.g., 100001"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Landmark (Optional)</label>
            <input
              v-model="addressForm.landmark"
              type="text"
              placeholder="e.g., Near First Bank, Opposite MTN Office"
            />
            <p class="field-hint">Helps delivery partners find you easily</p>
          </div>

          <div class="form-group">
            <label>GPS Coordinates (Optional)</label>
            <div class="gps-input">
              <input
                v-model="addressForm.latitude"
                type="number"
                step="any"
                placeholder="Latitude"
              />
              <input
                v-model="addressForm.longitude"
                type="number"
                step="any"
                placeholder="Longitude"
              />
              <button @click="getCurrentLocation" class="btn-gps" :disabled="loadingLocation">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {{ loadingLocation ? 'Getting...' : 'Get Current' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="addressForm.isDefault"
              />
              <span>Set as default address</span>
            </label>
          </div>

          <div class="form-actions">
            <button @click="cancelAddressForm" class="btn-secondary">Cancel</button>
            <button
              @click="saveAddress"
              :disabled="!isAddressFormValid || saving"
              class="btn-primary"
            >
              {{ saving ? 'Saving...' : (editingAddress ? 'Update Address' : 'Add Address') }}
            </button>
          </div>
        </div>

        <button v-if="!showAddressForm" @click="showAddressForm = true" class="btn-add-address">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add New Address
        </button>

        <div class="form-actions">
          <button @click="currentStep = 1" class="btn-secondary">Back</button>
          <button
            @click="currentStep = 3"
            :disabled="addresses.length === 0"
            class="btn-primary"
          >
            Next: Payment Methods
          </button>
        </div>
      </div>

      <!-- Step 3: Payment Methods -->
      <div v-if="currentStep === 3" class="step-form">
        <h2>Payment Methods</h2>
        <p class="step-description">
          Add your preferred payment methods for faster checkout. All payment information is securely encrypted.
        </p>

        <div class="payment-options">
          <div class="payment-option-card">
            <div class="option-icon">💳</div>
            <h3>Card Payment</h3>
            <p>Pay with debit or credit cards</p>
            <div class="option-status">Coming Soon</div>
          </div>

          <div class="payment-option-card">
            <div class="option-icon">🏦</div>
            <h3>Bank Transfer</h3>
            <p>Direct bank transfers via Flutterwave</p>
            <div class="option-status available">Available</div>
          </div>

          <div class="payment-option-card">
            <div class="option-icon">💰</div>
            <h3>Pay on Delivery</h3>
            <p>Pay cash when you receive your order</p>
            <div class="option-status available">Available</div>
          </div>
        </div>

        <div class="payment-notice">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <p>You'll be able to choose your payment method at checkout. Card payments will be available soon.</p>
        </div>

        <div class="form-actions">
          <button @click="currentStep = 2" class="btn-secondary">Back</button>
          <button
            @click="completeOnboarding"
            :disabled="saving"
            class="btn-primary"
          >
            {{ saving ? 'Completing...' : 'Complete Setup' }}
          </button>
        </div>
      </div>

      <!-- Success Message -->
      <div v-if="completed" class="completion-message">
        <div class="success-icon">🎉</div>
        <h2>You're All Set!</h2>
        <p>Your buyer account is ready. Start exploring products now!</p>
        <button @click="goToProducts" class="btn-primary">Start Shopping</button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

export default {
  name: 'BuyerOnboarding',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    const currentStep = ref(1);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const completed = ref(false);
    const showAddressForm = ref(false);
    const editingAddress = ref(null);
    const loadingLocation = ref(false);

    const steps = ref([
      {
        step: 1,
        title: 'Personal Info',
        description: 'Basic information',
        completed: false,
      },
      {
        step: 2,
        title: 'Addresses',
        description: 'Delivery locations',
        completed: false,
      },
      {
        step: 3,
        title: 'Payment',
        description: 'Payment setup',
        completed: false,
      },
    ]);

    const form = reactive({
      firstName: '',
      lastName: '',
      phoneNumber: '',
      shoppingInterests: [],
    });

    const addresses = ref([]);

    const addressForm = reactive({
      label: '',
      street: '',
      city: '',
      state: '',
      lga: '',
      postalCode: '',
      landmark: '',
      latitude: null,
      longitude: null,
      isDefault: false,
    });

    const availableInterests = [
      { value: 'electronics', label: 'Electronics', icon: '💻' },
      { value: 'fashion', label: 'Fashion', icon: '👗' },
      { value: 'home', label: 'Home & Living', icon: '🏠' },
      { value: 'sports', label: 'Sports', icon: '⚽' },
      { value: 'books', label: 'Books', icon: '📚' },
      { value: 'beauty', label: 'Beauty', icon: '💄' },
      { value: 'toys', label: 'Toys', icon: '🧸' },
      { value: 'food', label: 'Food & Drinks', icon: '🍔' },
    ];

    const nigerianStates = [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
      'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
      'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
      'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
      'Yobe', 'Zamfara',
    ];

    const user = computed(() => authStore.user);

    const isAddressFormValid = computed(() => {
      return addressForm.label && addressForm.street && addressForm.city && 
             addressForm.state && addressForm.lga;
    });

    // Load onboarding status
    const loadOnboardingStatus = async () => {
      try {
        loading.value = true;
        const response = await api.get('/buyer-onboarding/status');
        
        if (response.data.completedSteps) {
          const completedSteps = response.data.completedSteps;
          
          // Update form with saved data
          if (completedSteps.personalInfo) {
            Object.assign(form, completedSteps.personalInfo);
            steps.value[0].completed = true;
            currentStep.value = 2;
          }
          
          if (completedSteps.addresses) {
            addresses.value = completedSteps.addresses;
            steps.value[1].completed = true;
            currentStep.value = 3;
          }
        }
      } catch (err) {
        console.error('Error loading onboarding status:', err);
      } finally {
        loading.value = false;
      }
    };

    // Step 1: Save Personal Info
    const savePersonalInfo = async () => {
      try {
        error.value = null;
        saving.value = true;

        await api.post('/buyer-onboarding/personal-info', {
          firstName: form.firstName,
          lastName: form.lastName,
          phoneNumber: form.phoneNumber,
          shoppingInterests: form.shoppingInterests,
        });

        steps.value[0].completed = true;
        currentStep.value = 2;
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to save personal information';
      } finally {
        saving.value = false;
      }
    };

    // Step 2: Address Management
    const loadAddresses = async () => {
      try {
        const response = await api.get('/buyer-onboarding/addresses');
        addresses.value = response.data.addresses || [];
      } catch (err) {
        console.error('Error loading addresses:', err);
      }
    };

    const formatAddress = (address) => {
      return `${address.street}, ${address.city}, ${address.state}`;
    };

    const editAddress = (address) => {
      editingAddress.value = address;
      Object.assign(addressForm, address);
      showAddressForm.value = true;
    };

    const cancelAddressForm = () => {
      showAddressForm.value = false;
      editingAddress.value = null;
      resetAddressForm();
    };

    const resetAddressForm = () => {
      Object.assign(addressForm, {
        label: '',
        street: '',
        city: '',
        state: '',
        lga: '',
        postalCode: '',
        landmark: '',
        latitude: null,
        longitude: null,
        isDefault: false,
      });
    };

    const saveAddress = async () => {
      try {
        error.value = null;
        saving.value = true;

        const addressData = {
          label: addressForm.label,
          street: addressForm.street,
          city: addressForm.city,
          state: addressForm.state,
          lga: addressForm.lga,
          postalCode: addressForm.postalCode || null,
          landmark: addressForm.landmark || null,
          latitude: addressForm.latitude || null,
          longitude: addressForm.longitude || null,
          isDefault: addressForm.isDefault,
        };

        if (editingAddress.value) {
          await api.put(`/buyer-onboarding/addresses/${editingAddress.value.id}`, addressData);
        } else {
          await api.post('/buyer-onboarding/addresses', addressData);
        }

        await loadAddresses();
        cancelAddressForm();
        steps.value[1].completed = true;
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to save address';
      } finally {
        saving.value = false;
      }
    };

    const setDefaultAddress = async (addressId) => {
      try {
        await api.patch(`/buyer-onboarding/addresses/${addressId}/default`);
        await loadAddresses();
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to set default address';
      }
    };

    const deleteAddress = async (addressId) => {
      if (!confirm('Are you sure you want to delete this address?')) return;
      
      try {
        await api.delete(`/buyer-onboarding/addresses/${addressId}`);
        await loadAddresses();
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to delete address';
      }
    };

    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        error.value = 'Geolocation is not supported by your browser';
        return;
      }

      loadingLocation.value = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          addressForm.latitude = position.coords.latitude;
          addressForm.longitude = position.coords.longitude;
          loadingLocation.value = false;
        },
        (err) => {
          error.value = 'Unable to get your location';
          loadingLocation.value = false;
        }
      );
    };

    // Step 3: Complete Onboarding
    const completeOnboarding = async () => {
      try {
        error.value = null;
        saving.value = true;

        // Complete buyer-specific onboarding
        await api.post('/buyer-onboarding/complete');
        
        // Update general onboarding status
        await api.post('/onboarding/complete', { role: 'buyer' });
        
        steps.value[2].completed = true;
        completed.value = true;

        // Update user role in store
        await authStore.fetchUser();
      } catch (err) {
        error.value = err.response?.data?.message || 'Failed to complete onboarding';
      } finally {
        saving.value = false;
      }
    };

    const goToProducts = () => {
      router.push('/products');
    };

    onMounted(() => {
      loadOnboardingStatus();
      loadAddresses();
    });

    return {
      currentStep,
      steps,
      loading,
      saving,
      error,
      completed,
      form,
      addresses,
      addressForm,
      showAddressForm,
      editingAddress,
      loadingLocation,
      availableInterests,
      nigerianStates,
      user,
      isAddressFormValid,
      savePersonalInfo,
      formatAddress,
      editAddress,
      cancelAddressForm,
      saveAddress,
      setDefaultAddress,
      deleteAddress,
      getCurrentLocation,
      completeOnboarding,
      goToProducts,
    };
  },
};
</script>

<style scoped>
.buyer-onboarding {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.onboarding-header {
  text-align: center;
  margin-bottom: 3rem;
}

.onboarding-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.onboarding-header p {
  color: #6b7280;
  font-size: 1.1rem;
}

/* Progress Bar */
.progress-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3rem;
  position: relative;
}

.progress-bar::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: #e5e7eb;
  z-index: -1;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 0.5rem;
  transition: all 0.3s;
}

.progress-step.active .step-number {
  background: #10b981;
  color: white;
}

.progress-step.completed .step-number {
  background: #10b981;
  color: white;
}

.step-info h3 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #1f2937;
}

.step-info p {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Step Content */
.step-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.step-form h2 {
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.step-description {
  color: #6b7280;
  margin-bottom: 2rem;
}

/* Form Styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #10b981;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-hint {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Interests Grid */
.interests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.interest-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.interest-checkbox input {
  margin-right: 0.5rem;
  width: auto;
}

.interest-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.interest-checkbox input:checked + .interest-label {
  background: #ecfdf5;
  border-color: #10b981;
}

.interest-icon {
  font-size: 1.25rem;
}

/* Addresses */
.addresses-list {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.address-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: box-shadow 0.2s;
}

.address-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.address-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.address-header h4 {
  margin: 0;
  color: #1f2937;
}

.address-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.default-badge {
  background: #10b981;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.address-text {
  color: #4b5563;
  margin-bottom: 0.5rem;
}

.address-landmark {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.address-landmark svg {
  color: #10b981;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
}

.empty-state svg {
  margin-bottom: 1rem;
}

.address-form {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.address-form h3 {
  margin-bottom: 1.5rem;
  color: #1f2937;
}

.gps-input {
  display: flex;
  gap: 0.5rem;
}

.gps-input input {
  flex: 1;
}

.btn-gps {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-gps:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-gps:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 0.5rem;
  width: auto;
}

/* Payment Options */
.payment-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.payment-option-card {
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  text-align: center;
}

.option-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.payment-option-card h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.payment-option-card p {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.option-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 12px;
  font-size: 0.75rem;
}

.option-status.available {
  background: #ecfdf5;
  color: #10b981;
}

.payment-notice {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #eff6ff;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.payment-notice svg {
  color: #3b82f6;
  flex-shrink: 0;
}

.payment-notice p {
  color: #1e40af;
  margin: 0;
}

/* Buttons */
.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary,
.btn-text,
.btn-icon,
.btn-add-address {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 1rem;
}

.btn-primary {
  background: #10b981;
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-text {
  background: none;
  color: #10b981;
  padding: 0.25rem 0.5rem;
}

.btn-text:hover {
  text-decoration: underline;
}

.btn-icon {
  background: none;
  padding: 0.5rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  color: #1f2937;
  background: #f3f4f6;
}

.btn-icon.btn-danger:hover {
  color: #dc2626;
  background: #fee2e2;
}

.btn-add-address {
  width: 100%;
  background: #f3f4f6;
  color: #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.btn-add-address:hover {
  background: #e5e7eb;
}

/* Completion Message */
.completion-message {
  text-align: center;
  padding: 3rem;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.completion-message h2 {
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.completion-message p {
  color: #6b7280;
  margin-bottom: 2rem;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  margin-top: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .buyer-onboarding {
    padding: 1rem;
  }

  .progress-bar {
    flex-direction: column;
    gap: 1rem;
  }

  .progress-bar::before {
    display: none;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .payment-options {
    grid-template-columns: 1fr;
  }

  .interests-grid {
    grid-template-columns: 1fr;
  }
}
</style>
