import { defineStore } from 'pinia';
import chatService from '../services/chatService';
import { getSocket, onEvent, offEvent, emitEvent } from '../services/socket';

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [],
    currentConversation: null,
    messages: [],
    loading: false,
    error: null,
    typingUsers: new Set(),
  }),

  getters: {
    unreadCount: (state) => {
      return state.conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    },
    
    sortedConversations: (state) => {
      return [...state.conversations].sort((a, b) => {
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      });
    },
  },

  actions: {
    async fetchConversations() {
      this.loading = true;
      this.error = null;

      try {
        this.conversations = await chatService.getConversations();
        return { success: true };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch conversations';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async openConversation(otherUserId) {
      this.loading = true;
      this.error = null;

      try {
        this.currentConversation = await chatService.getOrCreateConversation(otherUserId);
        await this.loadMessages();
        
        // Subscribe to real-time updates
        this.subscribeToConversation(this.currentConversation.id);
        
        // Mark as read
        await chatService.markAsRead(this.currentConversation.id);
        
        return { success: true };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to open conversation';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async loadMessages(page = 1) {
      if (!this.currentConversation) return;

      try {
        const data = await chatService.getMessages(this.currentConversation.id, {
          page,
          limit: 50,
        });
        
        if (page === 1) {
          this.messages = data.messages;
        } else {
          this.messages = [...data.messages, ...this.messages];
        }
        
        return { success: true, pagination: data.pagination };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to load messages';
        return { success: false, error: this.error };
      }
    },

    async sendMessage(content) {
      if (!this.currentConversation || !content.trim()) return;

      try {
        const message = await chatService.sendMessage(
          this.currentConversation.id,
          content
        );
        
        this.messages.push(message);
        this.stopTyping();
        
        return { success: true, message };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to send message';
        return { success: false, error: this.error };
      }
    },

    subscribeToConversation(conversationId) {
      try {
        const socket = getSocket();
        
        // Subscribe to conversation
        emitEvent('chat:subscribe', conversationId);
        
        // Listen for new messages
        onEvent('chat:newMessage', this.handleNewMessage);
        onEvent('chat:messagesRead', this.handleMessagesRead);
        onEvent('chat:userTyping', this.handleUserTyping);
        onEvent('chat:userStoppedTyping', this.handleUserStoppedTyping);
      } catch (error) {
        console.error('Failed to subscribe to conversation:', error);
      }
    },

    unsubscribeFromConversation(conversationId) {
      try {
        emitEvent('chat:unsubscribe', conversationId);
        
        offEvent('chat:newMessage', this.handleNewMessage);
        offEvent('chat:messagesRead', this.handleMessagesRead);
        offEvent('chat:userTyping', this.handleUserTyping);
        offEvent('chat:userStoppedTyping', this.handleUserStoppedTyping);
      } catch (error) {
        console.error('Failed to unsubscribe from conversation:', error);
      }
    },

    handleNewMessage(data) {
      if (data.conversationId === this.currentConversation?.id) {
        this.messages.push(data.message);
        
        // Mark as read if conversation is open
        chatService.markAsRead(this.currentConversation.id);
      }
      
      // Update conversations list
      this.fetchConversations();
    },

    handleMessagesRead(data) {
      if (data.conversationId === this.currentConversation?.id) {
        // Mark messages as read in UI
        this.messages.forEach(msg => {
          if (msg.senderId !== data.readBy) {
            msg.read = true;
          }
        });
      }
    },

    handleUserTyping(data) {
      if (data.conversationId === this.currentConversation?.id) {
        this.typingUsers.add(data.userId);
      }
    },

    handleUserStoppedTyping(data) {
      if (data.conversationId === this.currentConversation?.id) {
        this.typingUsers.delete(data.userId);
      }
    },

    startTyping() {
      if (!this.currentConversation) return;
      emitEvent('chat:typing', {
        conversationId: this.currentConversation.id,
      });
    },

    stopTyping() {
      if (!this.currentConversation) return;
      emitEvent('chat:stopTyping', {
        conversationId: this.currentConversation.id,
      });
    },

    clearError() {
      this.error = null;
    },

    closeConversation() {
      if (this.currentConversation) {
        this.unsubscribeFromConversation(this.currentConversation.id);
      }
      this.currentConversation = null;
      this.messages = [];
      this.typingUsers.clear();
    },
  },
});
