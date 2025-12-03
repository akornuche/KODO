<template>
  <div v-if="showInstallPrompt" class="pwa-install-banner">
    <div class="pwa-banner-content">
      <div class="pwa-banner-icon">
        <img src="/icon-96x96.png" alt="KODO App Icon" />
      </div>
      <div class="pwa-banner-text">
        <h3>Install KODO App</h3>
        <p>Get the full app experience with offline access and push notifications</p>
      </div>
      <div class="pwa-banner-actions">
        <button @click="installPWA" class="btn-install">Install</button>
        <button @click="dismissPrompt" class="btn-dismiss">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const showInstallPrompt = ref(false);
const deferredPrompt = ref(null);

onMounted(() => {
  // Check if already dismissed
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  const dismissedDate = dismissed ? new Date(dismissed) : null;
  const daysSinceDismissal = dismissedDate 
    ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  // Show again after 7 days
  if (!dismissed || daysSinceDismissal > 7) {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt.value = e;
      // Show the install prompt after a short delay
      setTimeout(() => {
        showInstallPrompt.value = true;
      }, 3000); // Show after 3 seconds
    });

    // Detect if app is already installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      showInstallPrompt.value = false;
      deferredPrompt.value = null;
    });
  }
});

const installPWA = async () => {
  if (!deferredPrompt.value) {
    return;
  }

  // Show the install prompt
  deferredPrompt.value.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.value.userChoice;

  console.log(`User response to install prompt: ${outcome}`);

  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
  } else {
    console.log('User dismissed the install prompt');
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  }

  // Clear the deferred prompt
  deferredPrompt.value = null;
  showInstallPrompt.value = false;
};

const dismissPrompt = () => {
  showInstallPrompt.value = false;
  localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
};
</script>

<style scoped>
.pwa-install-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  max-width: 500px;
  width: calc(100% - 40px);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.pwa-banner-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e5e7eb;
}

.pwa-banner-icon img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}

.pwa-banner-text {
  flex: 1;
}

.pwa-banner-text h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px 0;
}

.pwa-banner-text p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.pwa-banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-install {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-install:hover {
  background: #059669;
}

.btn-dismiss {
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s;
}

.btn-dismiss:hover {
  color: #6b7280;
}

@media (max-width: 640px) {
  .pwa-install-banner {
    bottom: 10px;
    width: calc(100% - 20px);
  }

  .pwa-banner-content {
    padding: 12px;
  }

  .pwa-banner-icon img {
    width: 40px;
    height: 40px;
  }

  .pwa-banner-text h3 {
    font-size: 14px;
  }

  .pwa-banner-text p {
    font-size: 12px;
  }

  .btn-install {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>
