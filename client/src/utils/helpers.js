export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'yellow',
    paid: 'blue',
    shipped: 'indigo',
    delivered: 'green',
    completed: 'green',
    cancelled: 'red',
    rejected: 'red',
    open: 'blue',
    accepted: 'green',
    assigned: 'indigo',
    in_transit: 'purple',
  };
  return colors[status] || 'gray';
};

export const getRoleColor = (role) => {
  const colors = {
    buyer: 'blue',
    seller: 'green',
    courier: 'purple',
    admin: 'red',
  };
  return colors[role] || 'gray';
};

export const getRoleBadgeClass = (role) => {
  const color = getRoleColor(role);
  return `badge-${color}`;
};

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/${imagePath}`;
};

export const formatBidStatus = (status) => {
  const statusMap = {
    pending: 'Pending',
    offer_received: 'Offer Received',
    offer_sent: 'Offer Sent',
    accepted: 'Accepted',
    rejected: 'Rejected',
    completed: 'Completed',
  };
  return statusMap[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');
};
