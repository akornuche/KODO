<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

    <!-- Success/Error Messages -->
    <div v-if="successMessage" class="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
      {{ errorMessage }}
    </div>

    <!-- Profile Information -->
    <div class="card mb-8">
      <h2 class="text-xl font-semibold mb-6">Profile Information</h2>
      
      <form @submit.prevent="handleUpdateProfile">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Username -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Username *
            </label>
            <input
              v-model="profileForm.username"
              type="text"
              required
              minlength="3"
              maxlength="30"
              class="input"
              placeholder="Enter username"
            />
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              v-model="profileForm.email"
              type="email"
              required
              class="input"
              placeholder="Enter email"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              v-model="profileForm.phone"
              type="tel"
              class="input"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <!-- Location -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              v-model="profileForm.location"
              type="text"
              class="input"
              placeholder="City, State"
            />
          </div>
        </div>

        <!-- Role Display (read-only) -->
        <div class="mt-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Account Type
          </label>
          <div class="flex items-center gap-2">
            <span :class="getRoleBadgeClass(user?.role)">
              {{ user?.role }}
            </span>
            <p class="text-sm text-gray-600">
              (Contact support to change your account type)
            </p>
          </div>
        </div>

        <div class="mt-6">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="updatingProfile"
          >
            {{ updatingProfile ? 'Updating...' : 'Update Profile' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Bank Account Information (Sellers Only) -->
    <div v-if="user?.role === 'seller'" class="card mb-8">
      <h2 class="text-xl font-semibold mb-6">Bank Account Information</h2>
      <p class="text-sm text-gray-600 mb-6">
        Add your bank account details to receive payments for completed jobs. This information is required for payouts.
      </p>
      
      <form @submit.prevent="handleUpdateBankAccount">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Bank Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Bank Name *
            </label>
            <input
              v-model="bankAccountForm.bankName"
              type="text"
              required
              class="input"
              placeholder="e.g., Access Bank, Zenith Bank"
            />
          </div>

          <!-- Account Number -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Account Number *
            </label>
            <input
              v-model="bankAccountForm.accountNumber"
              type="text"
              required
              pattern="[0-9]{10}"
              maxlength="10"
              class="input"
              placeholder="10-digit account number"
            />
            <p class="text-xs text-gray-600 mt-1">
              Must be exactly 10 digits
            </p>
          </div>

          <!-- Account Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Account Name *
            </label>
            <input
              v-model="bankAccountForm.accountName"
              type="text"
              required
              class="input"
              placeholder="Full name as on bank account"
            />
          </div>

          <!-- Bank Code -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Bank Code *
            </label>
            <input
              v-model="bankAccountForm.bankCode"
              type="text"
              required
              class="input"
              placeholder="e.g., 044, 057"
            />
            <p class="text-xs text-gray-600 mt-1">
              3-digit bank code (contact your bank if unsure)
            </p>
          </div>
        </div>

        <div class="mt-6">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="updatingBankAccount"
          >
            {{ updatingBankAccount ? 'Updating...' : 'Update Bank Account' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Change Password -->
    <div class="card mb-8">
      <h2 class="text-xl font-semibold mb-6">Change Password</h2>
      
      <form @submit.prevent="handleChangePassword">
        <div class="grid grid-cols-1 gap-6 max-w-md">
          <!-- Current Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Current Password *
            </label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              required
              minlength="8"
              class="input"
              placeholder="Enter current password"
            />
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              New Password *
            </label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              required
              minlength="8"
              class="input"
              placeholder="Enter new password"
            />
            <p class="text-xs text-gray-600 mt-1">
              Minimum 8 characters, include uppercase, lowercase, number, and special character
            </p>
          </div>

          <!-- Confirm New Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password *
            </label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              required
              minlength="8"
              class="input"
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <div class="mt-6">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="changingPassword"
          >
            {{ changingPassword ? 'Changing...' : 'Change Password' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Account Statistics -->
    <div class="card mb-8">
      <h2 class="text-xl font-semibold mb-6">Account Statistics</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">Member Since</p>
          <p class="text-lg font-semibold">{{ formatDate(user?.createdAt) }}</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">Last Login</p>
          <p class="text-lg font-semibold">{{ formatRelativeTime(user?.lastLogin) }}</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">Account Status</p>
          <p class="text-lg font-semibold">
            <span class="badge-success">Active</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="card border-red-200 bg-red-50">
      <h2 class="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
      <p class="text-sm text-red-700 mb-4">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      
      <button
        @click="showDeleteModal = true"
        class="btn btn-danger"
      >
        Delete Account
      </button>
    </div>

    <!-- Delete Account Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-red-900 mb-4">Delete Account</h3>
        <p class="text-gray-700 mb-4">
          Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.
        </p>

        <form @submit.prevent="handleDeleteAccount">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Type your password to confirm:
            </label>
            <input
              v-model="deletePassword"
              type="password"
              required
              class="input"
              placeholder="Enter your password"
            />
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              class="btn btn-danger flex-1"
              :disabled="deletingAccount"
            >
              {{ deletingAccount ? 'Deleting...' : 'Yes, Delete My Account' }}
            </button>
            <button
              type="button"
              @click="showDeleteModal = false; deletePassword = ''"
              class="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/services/apiClient';
import { formatDate, formatRelativeTime, getRoleBadgeClass } from '@/utils/helpers';

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

const successMessage = ref('');
const errorMessage = ref('');
const updatingProfile = ref(false);
const changingPassword = ref(false);
const deletingAccount = ref(false);
const showDeleteModal = ref(false);
const deletePassword = ref('');

// Bank account state
const updatingBankAccount = ref(false);
const bankAccountForm = reactive({
  bankName: '',
  accountNumber: '',
  accountName: '',
  bankCode: '',
});

const profileForm = reactive({
  username: '',
  email: '',
  phone: '',
  location: '',
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const clearMessages = () => {
  successMessage.value = '';
  errorMessage.value = '';
};

const handleUpdateProfile = async () => {
  clearMessages();
  
  if (!profileForm.username || !profileForm.email) {
    errorMessage.value = 'Username and email are required';
    return;
  }

  updatingProfile.value = true;
  try {
    const response = await apiClient.put('/api/users/profile', {
      username: profileForm.username,
      email: profileForm.email,
      phone: profileForm.phone || null,
      location: profileForm.location || null,
    });

    // Update auth store with new user data
    authStore.user = response.data.user || response.data;
    successMessage.value = 'Profile updated successfully!';
    
    // Scroll to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Failed to update profile';
  } finally {
    updatingProfile.value = false;
  }
};

const handleUpdateBankAccount = async () => {
  clearMessages();
  
  // Validate required fields
  if (!bankAccountForm.bankName || !bankAccountForm.accountNumber || 
      !bankAccountForm.accountName || !bankAccountForm.bankCode) {
    errorMessage.value = 'All bank account fields are required';
    return;
  }

  // Validate account number format (10 digits)
  if (!/^\d{10}$/.test(bankAccountForm.accountNumber)) {
    errorMessage.value = 'Account number must be exactly 10 digits';
    return;
  }

  updatingBankAccount.value = true;
  try {
    const response = await apiClient.put('/api/users/bank-account', {
      bankName: bankAccountForm.bankName,
      accountNumber: bankAccountForm.accountNumber,
      accountName: bankAccountForm.accountName,
      bankCode: bankAccountForm.bankCode,
    });

    successMessage.value = 'Bank account information updated successfully!';
    
    // Update auth store with new user data if returned
    if (response.data.user) {
      authStore.user = response.data.user;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Failed to update bank account information';
  } finally {
    updatingBankAccount.value = false;
  }
};

const handleChangePassword = async () => {
  clearMessages();

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    errorMessage.value = 'New passwords do not match';
    return;
  }

  if (passwordForm.newPassword.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters';
    return;
  }

  changingPassword.value = true;
  try {
    await apiClient.put('/api/users/password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });

    successMessage.value = 'Password changed successfully!';
    
    // Clear password form
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Failed to change password';
  } finally {
    changingPassword.value = false;
  }
};

const handleDeleteAccount = async () => {
  if (!deletePassword.value) {
    alert('Please enter your password to confirm deletion');
    return;
  }

  deletingAccount.value = true;
  try {
    await apiClient.delete('/api/users/account', {
      data: { password: deletePassword.value },
    });

    alert('Your account has been deleted. You will be logged out.');
    authStore.logout();
    router.push('/');
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to delete account');
  } finally {
    deletingAccount.value = false;
    showDeleteModal.value = false;
    deletePassword.value = '';
  }
};

const fetchBankAccount = async () => {
  try {
    const response = await apiClient.get('/api/users/bank-account');
    const bankData = response.data;
    
    // Populate bank account form
    bankAccountForm.bankName = bankData.bankName || '';
    bankAccountForm.accountNumber = bankData.accountNumber || '';
    bankAccountForm.accountName = bankData.accountName || '';
    bankAccountForm.bankCode = bankData.bankCode || '';
  } catch (error) {
    // If no bank account data exists yet, that's okay - form will be empty
    if (error.response?.status !== 404) {
      console.error('Failed to fetch bank account:', error);
    }
  }
};

onMounted(() => {
  // Populate form with current user data
  if (user.value) {
    profileForm.username = user.value.username || '';
    profileForm.email = user.value.email || '';
    profileForm.phone = user.value.phone || '';
    profileForm.location = user.value.location || '';
  }

  // Fetch bank account information for sellers
  if (user.value?.role === 'seller') {
    fetchBankAccount();
  }
});
</script>
