import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCartStore = defineStore('cart', () => {
  // State
  const items = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  // Getters
  const itemCount = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0);
  });

  const totalAmount = computed(() => {
    return items.value.reduce((total, item) => total + (item.price * item.quantity), 0);
  });

  const isEmpty = computed(() => items.value.length === 0);

  // Actions
  const addItem = (product, quantity = 1) => {
    const existingItem = items.value.find(item => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      items.value.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.images?.[0] || null,
        seller: product.seller,
        quantity,
        addedAt: new Date(),
      });
    }
  };

  const removeItem = (productId) => {
    const index = items.value.findIndex(item => item.id === productId);
    if (index > -1) {
      items.value.splice(index, 1);
    }
  };

  const updateQuantity = (productId, quantity) => {
    const item = items.value.find(item => item.id === productId);
    if (item) {
      if (quantity <= 0) {
        removeItem(productId);
      } else {
        item.quantity = quantity;
      }
    }
  };

  const clearCart = () => {
    items.value = [];
  };

  const checkout = async (deliveryAddress, notes = '') => {
    isLoading.value = true;
    error.value = null;

    try {
      const orders = [];

      // Create orders for each cart item
      for (const item of items.value) {
        const orderData = {
          productId: item.id,
          quantity: item.quantity,
          deliveryAddress,
          notes,
        };

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(orderData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Failed to create order for ${item.title}`);
        }

        orders.push(data.order);
      }

      // Clear cart after successful checkout
      clearCart();

      return orders;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // State
    items,
    isLoading,
    error,

    // Getters
    itemCount,
    totalAmount,
    isEmpty,

    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    checkout,
  };
});