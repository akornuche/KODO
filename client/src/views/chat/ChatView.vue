<template>
  <div class="h-screen flex bg-gray-50">
    <!-- Conversations List -->
    <aside class="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-xl font-bold">Messages</h2>
        <p v-if="chatStore.unreadCount > 0" class="text-sm text-gray-600">
          {{ chatStore.unreadCount }} unread
        </p>
      </div>

      <!-- Conversations -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="chatStore.loading && !chatStore.conversations.length" class="p-4">
          <div class="animate-pulse space-y-4">
            <div v-for="i in 5" :key="i" class="flex gap-3">
              <div class="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div class="flex-1">
                <div class="bg-gray-300 h-4 rounded mb-2"></div>
                <div class="bg-gray-300 h-3 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="!chatStore.conversations.length"
          class="p-4 text-center text-gray-600"
        >
          No conversations yet
        </div>

        <button
          v-for="conv in chatStore.sortedConversations"
          :key="conv.id"
          @click="selectConversation(conv)"
          :class="[
            'w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100',
            chatStore.currentConversation?.id === conv.id ? 'bg-primary-50' : ''
          ]"
        >
          <div class="flex items-start gap-3">
            <!-- Avatar -->
            <div class="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
              {{ conv.otherUser.username[0].toUpperCase() }}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-baseline mb-1">
                <p class="font-semibold text-gray-900 truncate">
                  {{ conv.otherUser.username }}
                </p>
                <span v-if="conv.lastMessage" class="text-xs text-gray-500">
                  {{ formatRelativeTime(conv.lastMessage.createdAt) }}
                </span>
              </div>

              <div class="flex justify-between items-center">
                <p class="text-sm text-gray-600 truncate">
                  {{ conv.lastMessage?.content || 'No messages yet' }}
                </p>
                <span
                  v-if="conv.unreadCount > 0"
                  class="ml-2 bg-primary-600 text-white text-xs font-semibold px-2 py-1 rounded-full"
                >
                  {{ conv.unreadCount }}
                </span>
              </div>

              <span
                class="inline-block mt-1 badge"
                :class="`badge-${getRoleColor(conv.otherUser.role)}`"
              >
                {{ conv.otherUser.role }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </aside>

    <!-- Chat Area -->
    <main class="flex-1 flex flex-col">
      <!-- No Conversation Selected -->
      <div
        v-if="!chatStore.currentConversation"
        class="flex-1 flex items-center justify-center text-gray-500"
      >
        <div class="text-center">
          <p class="text-xl mb-2">Select a conversation to start chatting</p>
          <p class="text-sm">Your messages will appear here</p>
        </div>
      </div>

      <!-- Active Conversation -->
      <template v-else>
        <!-- Chat Header -->
        <div class="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h3 class="font-semibold text-lg">
              {{ chatStore.currentConversation.otherUser.username }}
            </h3>
            <span
              class="badge text-xs"
              :class="`badge-${getRoleColor(chatStore.currentConversation.otherUser.role)}`"
            >
              {{ chatStore.currentConversation.otherUser.role }}
            </span>
          </div>

          <button
            @click="chatStore.closeConversation()"
            class="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <!-- Messages -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        >
          <div
            v-for="message in chatStore.messages"
            :key="message.id"
            :class="[
              'flex',
              message.senderId === authStore.user?.id ? 'justify-end' : 'justify-start'
            ]"
          >
            <div
              :class="[
                'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                message.senderId === authStore.user?.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-900'
              ]"
            >
              <p class="break-words">{{ message.content }}</p>
              <div
                :class="[
                  'text-xs mt-1 flex items-center gap-1',
                  message.senderId === authStore.user?.id
                    ? 'text-primary-100 justify-end'
                    : 'text-gray-500'
                ]"
              >
                <span>{{ formatRelativeTime(message.createdAt) }}</span>
                <span v-if="message.senderId === authStore.user?.id && message.read">
                  ✓✓
                </span>
              </div>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div
            v-if="chatStore.typingUsers.size > 0"
            class="flex justify-start"
          >
            <div class="bg-white px-4 py-2 rounded-lg text-gray-600 text-sm">
              Typing...
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="bg-white border-t border-gray-200 p-4">
          <form @submit.prevent="sendMessage" class="flex gap-2">
            <input
              v-model="newMessage"
              @input="handleTyping"
              type="text"
              placeholder="Type a message..."
              class="flex-1 input"
              maxlength="5000"
            />
            <button
              type="submit"
              :disabled="!newMessage.trim()"
              class="btn btn-primary disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useChatStore } from '../../stores/chat';
import { useAuthStore } from '../../stores/auth';
import { formatRelativeTime, getRoleColor } from '../../utils/helpers';

const route = useRoute();
const chatStore = useChatStore();
const authStore = useAuthStore();

const newMessage = ref('');
const messagesContainer = ref(null);
let typingTimeout = null;

const selectConversation = async (conversation) => {
  await chatStore.openConversation(conversation.otherUser.id);
  scrollToBottom();
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;

  const result = await chatStore.sendMessage(newMessage.value);
  if (result.success) {
    newMessage.value = '';
    await nextTick();
    scrollToBottom();
  }
};

const handleTyping = () => {
  chatStore.startTyping();
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    chatStore.stopTyping();
  }, 3000);
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(() => chatStore.messages.length, () => {
  nextTick(() => scrollToBottom());
});

onMounted(async () => {
  await chatStore.fetchConversations();
  
  // Open conversation if user query param exists
  if (route.query.user) {
    await chatStore.openConversation(route.query.user);
    scrollToBottom();
  }
});

onUnmounted(() => {
  chatStore.closeConversation();
  clearTimeout(typingTimeout);
});
</script>

<style scoped>
.h-screen {
  height: calc(100vh - 64px); /* Subtract navbar height */
}
</style>
