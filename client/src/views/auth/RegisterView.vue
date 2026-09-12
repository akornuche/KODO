<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Already have an account?
          <router-link to="/login" class="font-medium text-primary-600 hover:text-primary-500">
            Sign in
          </router-link>
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <!-- Error Message -->
        <div v-if="authStore.error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {{ authStore.error }}
        </div>

        <div class="space-y-4">
          <!-- Username (Optional - will be auto-generated if not provided) -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">Username <span class="text-gray-500 text-xs">(Optional - auto-generated if not provided)</span></label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              minlength="3"
              maxlength="50"
              class="mt-1 input"
              placeholder="johndoe (or leave blank for auto-generation)"
              :disabled="authStore.loading"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              class="mt-1 input"
              placeholder="john@example.com"
              :disabled="authStore.loading"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <div class="relative mt-1">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="8"
                class="w-full input pr-10"
                placeholder="Min. 8 characters"
                :disabled="authStore.loading"
                @input="checkPasswordStrength"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                :disabled="authStore.loading"
              >
                <svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                </svg>
              </button>
            </div>
            
            <!-- Password Strength Indicator -->
            <div v-if="form.password" class="mt-2">
              <div class="flex items-center space-x-2">
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    :class="[
                      'h-2 rounded-full transition-all',
                      passwordStrength.color
                    ]"
                    :style="{ width: passwordStrength.percentage + '%' }"
                  ></div>
                </div>
                <span :class="['text-xs font-medium', passwordStrength.textColor]">
                  {{ passwordStrength.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div class="relative mt-1">
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                class="w-full input pr-10"
                placeholder="Re-enter password"
                :disabled="authStore.loading"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                :disabled="authStore.loading"
              >
                <svg v-if="!showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                </svg>
              </button>
            </div>
            <p v-if="form.confirmPassword && form.password !== form.confirmPassword" class="mt-1 text-sm text-red-600">
              Passwords don't match
            </p>
          </div>

          <!-- Role Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">I want to:</label>
            <div class="grid grid-cols-2 gap-3">
              <label
                v-for="role in roles"
                :key="role.value"
                :class="[
                  'relative border rounded-lg p-4 cursor-pointer flex flex-col items-center',
                  form.role === role.value
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400'
                ]"
              >
                <input
                  type="radio"
                  v-model="form.role"
                  :value="role.value"
                  class="sr-only"
                  required
                />
                <div :class="['text-3xl mb-2', form.role === role.value ? 'opacity-100' : 'opacity-60']">
                  {{ role.icon }}
                </div>
                <span :class="['text-sm font-medium', form.role === role.value ? 'text-primary-900' : 'text-gray-900']">
                  {{ role.label }}
                </span>
                <span class="text-xs text-gray-600 text-center mt-1">
                  {{ role.description }}
                </span>
              </label>
            </div>
          </div>

          <!-- Terms & Conditions -->
          <div class="flex items-start">
            <input
              id="terms"
              v-model="form.acceptTerms"
              type="checkbox"
              required
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
            />
            <label for="terms" class="ml-2 block text-sm text-gray-900">
              I agree to the
              <a href="#" class="text-primary-600 hover:text-primary-500">Terms of Service</a>
              and
              <a href="#" class="text-primary-600 hover:text-primary-500">Privacy Policy</a>
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="authStore.loading || !isFormValid"
            class="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!authStore.loading">Create Account</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating account...
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useSEO } from '../../composables/useSEO';

// SEO for registration page
useSEO({
  title: 'Create Account - Join KODO Marketplace',
  description: 'Sign up for KODO to start buying, selling, or delivering across Nigeria. Secure platform with real-time tracking and escrow payments.',
  keywords: ['register', 'sign up', 'create account', 'join KODO', 'seller registration', 'courier registration', 'Nigeria marketplace'],
  url: '/register',
  type: 'website'
});

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'buyer',
  acceptTerms: false,
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const roles = [
  {
    value: 'buyer',
    label: 'Buy',
    icon: '🛒',
    description: 'Find and purchase items'
  },
  {
    value: 'seller',
    label: 'Sell',
    icon: '💼',
    description: 'List and sell products'
  },
  {
    value: 'courier',
    label: 'Deliver',
    icon: '🚚',
    description: 'Deliver orders'
  },
  {
    value: 'admin',
    label: 'Admin',
    icon: '👤',
    description: 'Manage platform'
  },
];

const passwordStrength = computed(() => {
  const password = form.password;
  if (!password) return { percentage: 0, color: 'bg-gray-300', textColor: 'text-gray-500', label: '' };

  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 20;
  if (/[^a-zA-Z\d]/.test(password)) strength += 15;

  if (strength < 40) {
    return { percentage: strength, color: 'bg-red-500', textColor: 'text-red-600', label: 'Weak' };
  } else if (strength < 70) {
    return { percentage: strength, color: 'bg-yellow-500', textColor: 'text-yellow-600', label: 'Fair' };
  } else if (strength < 90) {
    return { percentage: strength, color: 'bg-blue-500', textColor: 'text-blue-600', label: 'Good' };
  } else {
    return { percentage: strength, color: 'bg-green-500', textColor: 'text-green-600', label: 'Strong' };
  }
});

const isFormValid = computed(() => {
  return (
    form.email.includes('@') &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword &&
    form.role &&
    form.acceptTerms
  );
});

const checkPasswordStrength = () => {
  // Trigger reactivity for password strength
};

const handleRegister = async () => {
  if (!isFormValid.value) return;

  authStore.clearError();

  const result = await authStore.register({
    username: form.username,
    email: form.email,
    password: form.password,
    role: form.role,
  });

  if (result.success) {
    // Redirect to onboarding based on role
    const onboardingRoutes = {
      buyer: '/onboarding/buyer',
      seller: '/onboarding/seller',
      courier: '/onboarding/courier',
      admin: '/dashboard' // Admins don't have onboarding
    };
    
    const targetRoute = onboardingRoutes[form.role] || '/dashboard';
    router.push(targetRoute);
  }
};
</script>
