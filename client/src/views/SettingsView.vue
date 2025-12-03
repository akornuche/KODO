<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
        <p class="text-gray-600 mt-1">Manage your account preferences</p>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-lg shadow mb-6">
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px overflow-x-auto">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- General Tab -->
          <div v-show="activeTab === 'general'">
            <form @submit.prevent="saveGeneral">
              <div class="space-y-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <select v-model="settings.theme" class="input max-w-xs">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select v-model="settings.language" class="input max-w-xs">
                    <option value="en">English</option>
                    <option value="yo">Yoruba</option>
                    <option value="ig">Igbo</option>
                    <option value="ha">Hausa</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select v-model="settings.currency" class="input max-w-xs">
                    <option value="NGN">Nigerian Naira (₦)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GBP">British Pound (£)</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select v-model="settings.timezone" class="input max-w-xs">
                    <option value="Africa/Lagos">Lagos (WAT)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">New York (EST)</option>
                  </select>
                </div>

                <button type="submit" :disabled="saving" class="btn btn-primary">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Notifications Tab -->
          <div v-show="activeTab === 'notifications'">
            <form @submit.prevent="saveNotifications">
              <div class="space-y-6">
                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                  <div class="space-y-3">
                    <label class="flex items-center">
                      <input
                        v-model="notifications.orderUpdates"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="ml-3 text-sm text-gray-700">Order updates and status changes</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        v-model="notifications.promotions"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="ml-3 text-sm text-gray-700">Promotions and special offers</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        v-model="notifications.newsletter"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="ml-3 text-sm text-gray-700">Weekly newsletter</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Push Notifications</h3>
                  <div class="space-y-3">
                    <label class="flex items-center">
                      <input
                        v-model="notifications.pushEnabled"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="ml-3 text-sm text-gray-700">Enable push notifications</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        v-model="notifications.messageAlerts"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        :disabled="!notifications.pushEnabled"
                      />
                      <span class="ml-3 text-sm text-gray-700">New message alerts</span>
                    </label>
                  </div>
                </div>

                <button type="submit" :disabled="saving" class="btn btn-primary">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Privacy Tab -->
          <div v-show="activeTab === 'privacy'">
            <form @submit.prevent="savePrivacy">
              <div class="space-y-6">
                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Profile Visibility</h3>
                  <div class="space-y-3">
                    <label class="flex items-center">
                      <input
                        v-model="privacy.showProfile"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="ml-3 text-sm text-gray-700">Make my profile public</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        v-model="privacy.showActivity"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="ml-3 text-sm text-gray-700">Show my activity status</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Data Collection</h3>
                  <div class="space-y-3">
                    <label class="flex items-center">
                      <input
                        v-model="privacy.analytics"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="ml-3 text-sm text-gray-700">Allow analytics tracking</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        v-model="privacy.personalization"
                        type="checkbox"
                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span class="ml-3 text-sm text-gray-700">Enable personalized recommendations</span>
                    </label>
                  </div>
                </div>

                <button type="submit" :disabled="saving" class="btn btn-primary">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Security Tab -->
          <div v-show="activeTab === 'security'">
            <div class="space-y-8">
              <!-- Two-Factor Authentication -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div v-if="!security.twoFactorEnabled" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p class="text-sm text-yellow-800 mb-4">
                    Enable 2FA for added security. You'll need to enter a code from your authenticator app when logging in.
                  </p>
                  <button @click="enable2FA" class="btn btn-primary">
                    Enable 2FA
                  </button>
                </div>
                <div v-else class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p class="text-sm text-green-800 mb-4">
                    Two-factor authentication is enabled. Your account is protected.
                  </p>
                  <button @click="disable2FA" class="btn btn-secondary">
                    Disable 2FA
                  </button>
                </div>
              </div>

              <!-- Change Password -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                <form @submit.prevent="changePassword" class="space-y-4 max-w-md">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input v-model="passwordForm.current" type="password" required class="input" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input v-model="passwordForm.new" type="password" required minlength="8" class="input" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input v-model="passwordForm.confirm" type="password" required class="input" />
                  </div>
                  <button type="submit" :disabled="saving" class="btn btn-primary">
                    {{ saving ? 'Updating...' : 'Update Password' }}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white rounded-lg shadow p-6 border-2 border-red-200">
        <h3 class="text-lg font-medium text-red-900 mb-2">Danger Zone</h3>
        <p class="text-sm text-gray-600 mb-4">These actions are irreversible. Please be certain.</p>
        <div class="flex gap-4">
          <button @click="resetSettings" class="btn btn-secondary">
            Reset All Settings
          </button>
          <button @click="deleteAccount" class="btn bg-red-600 hover:bg-red-700 text-white">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import settingsService from '../services/settingsService';

const activeTab = ref('general');
const saving = ref(false);

const tabs = [
  { id: 'general', name: 'General' },
  { id: 'notifications', name: 'Notifications' },
  { id: 'privacy', name: 'Privacy' },
  { id: 'security', name: 'Security' },
];

const settings = ref({
  theme: 'light',
  language: 'en',
  currency: 'NGN',
  timezone: 'Africa/Lagos',
});

const notifications = ref({
  orderUpdates: true,
  promotions: true,
  newsletter: false,
  pushEnabled: false,
  messageAlerts: true,
});

const privacy = ref({
  showProfile: true,
  showActivity: true,
  analytics: true,
  personalization: true,
});

const security = ref({
  twoFactorEnabled: false,
});

const passwordForm = ref({
  current: '',
  new: '',
  confirm: '',
});

onMounted(() => {
  loadSettings();
});

async function loadSettings() {
  try {
    const data = await settingsService.getSettings();
    if (data.settings) {
      settings.value = { ...settings.value, ...data.settings };
    }
    if (data.notifications) {
      notifications.value = { ...notifications.value, ...data.notifications };
    }
    if (data.privacy) {
      privacy.value = { ...privacy.value, ...data.privacy };
    }
    security.value.twoFactorEnabled = data.twoFactorEnabled || false;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveGeneral() {
  saving.value = true;
  try {
    await settingsService.updateSettings(settings.value);
    alert('Settings saved successfully!');
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('Failed to save settings. Please try again.');
  } finally {
    saving.value = false;
  }
}

async function saveNotifications() {
  saving.value = true;
  try {
    await settingsService.updateNotifications(notifications.value);
    alert('Notification preferences saved!');
  } catch (error) {
    console.error('Failed to save notifications:', error);
    alert('Failed to save preferences. Please try again.');
  } finally {
    saving.value = false;
  }
}

async function savePrivacy() {
  saving.value = true;
  try {
    await settingsService.updatePrivacy(privacy.value);
    alert('Privacy settings saved!');
  } catch (error) {
    console.error('Failed to save privacy settings:', error);
    alert('Failed to save settings. Please try again.');
  } finally {
    saving.value = false;
  }
}

async function changePassword() {
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    alert('New passwords do not match!');
    return;
  }

  saving.value = true;
  try {
    // TODO: Implement password change API
    alert('Password updated successfully!');
    passwordForm.value = { current: '', new: '', confirm: '' };
  } catch (error) {
    console.error('Failed to change password:', error);
    alert('Failed to update password. Please try again.');
  } finally {
    saving.value = false;
  }
}

async function enable2FA() {
  try {
    const data = await settingsService.enable2FA({});
    // TODO: Show QR code modal for setup
    alert('2FA enabled! Please scan the QR code with your authenticator app.');
    security.value.twoFactorEnabled = true;
  } catch (error) {
    console.error('Failed to enable 2FA:', error);
    alert('Failed to enable 2FA. Please try again.');
  }
}

async function disable2FA() {
  const password = prompt('Enter your password to disable 2FA:');
  if (!password) return;

  try {
    await settingsService.disable2FA(password);
    alert('2FA disabled successfully!');
    security.value.twoFactorEnabled = false;
  } catch (error) {
    console.error('Failed to disable 2FA:', error);
    alert('Failed to disable 2FA. Please check your password and try again.');
  }
}

async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to default?')) {
    return;
  }

  try {
    await settingsService.resetSettings();
    alert('Settings reset successfully!');
    loadSettings();
  } catch (error) {
    console.error('Failed to reset settings:', error);
    alert('Failed to reset settings. Please try again.');
  }
}

function deleteAccount() {
  alert('Account deletion is not yet implemented. Please contact support.');
}
</script>
