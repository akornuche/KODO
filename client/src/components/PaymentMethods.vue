<template>
  <div class="payment-methods">
    <h3 class="text-lg font-semibold mb-4">Select Payment Method</h3>

    <!-- Payment Provider Selection -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Payment Provider</label>
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="selectedProvider = 'stripe'"
          :class="[
            'p-4 border rounded-lg text-left transition-colors',
            selectedProvider === 'stripe'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-center">
            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
              <span class="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <div class="font-medium">Stripe</div>
              <div class="text-sm text-gray-500">International payments</div>
            </div>
          </div>
        </button>

        <button
          @click="selectedProvider = 'flutterwave'"
          :class="[
            'p-4 border rounded-lg text-left transition-colors',
            selectedProvider === 'flutterwave'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-center">
            <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
              <span class="text-white font-bold text-sm">F</span>
            </div>
            <div>
              <div class="font-medium">Flutterwave</div>
              <div class="text-sm text-gray-500">Nigerian payments</div>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Payment Method Selection (Flutterwave) -->
    <div v-if="selectedProvider === 'flutterwave'" class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
      <div class="space-y-3">
        <button
          @click="selectedMethod = 'card'"
          :class="[
            'w-full p-4 border rounded-lg text-left transition-colors',
            selectedMethod === 'card'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-center">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
              </svg>
            </div>
            <div>
              <div class="font-medium">Card Payment</div>
              <div class="text-sm text-gray-500">Visa, Mastercard, Verve</div>
            </div>
          </div>
        </button>

        <button
          @click="selectedMethod = 'mobilemoney'"
          :class="[
            'w-full p-4 border rounded-lg text-left transition-colors',
            selectedMethod === 'mobilemoney'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-center">
            <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <div class="font-medium">Mobile Money</div>
              <div class="text-sm text-gray-500">Airtel, MTN, Glo</div>
            </div>
          </div>
        </button>

        <button
          @click="selectedMethod = 'banktransfer'"
          :class="[
            'w-full p-4 border rounded-lg text-left transition-colors',
            selectedMethod === 'banktransfer'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-center">
            <div class="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div>
              <div class="font-medium">Bank Transfer</div>
              <div class="text-sm text-gray-500">Direct bank transfer</div>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Payment Method Selection (Stripe) -->
    <div v-if="selectedProvider === 'stripe'" class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
      <div class="space-y-3">
        <button
          @click="selectedMethod = 'card'"
          :class="[
            'w-full p-4 border rounded-lg text-left transition-colors',
            selectedMethod === 'card'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-center">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
              </svg>
            </div>
            <div>
              <div class="font-medium">Credit/Debit Card</div>
              <div class="text-sm text-gray-500">Visa, Mastercard, American Express</div>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Payment Summary -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-600">Payment Provider:</span>
        <span class="font-medium capitalize">{{ selectedProvider }}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-600">Payment Method:</span>
        <span class="font-medium capitalize">{{ selectedMethod }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaymentMethods',
  props: {
    modelValue: {
      type: Object,
      default: () => ({
        provider: 'flutterwave',
        method: 'card'
      })
    }
  },
  data() {
    return {
      selectedProvider: this.modelValue.provider || 'flutterwave',
      selectedMethod: this.modelValue.method || 'card'
    }
  },
  watch: {
    selectedProvider() {
      this.emitUpdate()
    },
    selectedMethod() {
      this.emitUpdate()
    }
  },
  methods: {
    emitUpdate() {
      this.$emit('update:modelValue', {
        provider: this.selectedProvider,
        method: this.selectedMethod
      })
    }
  }
}
</script>

<style scoped>
/* Additional styles if needed */
</style>