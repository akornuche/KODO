import { io } from 'socket.io-client';

let socket = null;
let socketToken = null;

export const connectSocket = (token) => {
  if (!token) {
    return null;
  }

  if (socket?.connected && socketToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socketToken = token;
  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connected', (data) => {
    console.log('✅ Socket.IO Connected:', data);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO Connection Error:', error.message);

    if (error.message === 'Invalid token' || error.message === 'Authentication required') {
      socket.io.opts.reconnection = false;
      socket.disconnect();
      socket = null;
      socketToken = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('kodo:auth-invalid'));
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO Disconnected:', reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketToken = null;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call connectSocket first.');
  }
  return socket;
};

export const emitEvent = (event, data) => {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    console.warn('Socket not connected. Cannot emit event:', event);
  }
};

export const onEvent = (event, handler) => {
  if (socket) {
    socket.on(event, handler);
  }
};

export const offEvent = (event, handler) => {
  if (socket) {
    socket.off(event, handler);
  }
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  emitEvent,
  onEvent,
  offEvent,
};
