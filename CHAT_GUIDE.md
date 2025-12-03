# Real-Time Chat System Guide

## Overview

The KODO platform includes a real-time chat system enabling direct communication between buyers and sellers. Built with Socket.IO and PostgreSQL, it supports private conversations, message history, typing indicators, and read receipts.

---

## Features

- **Private Conversations**: One-on-one chat between users
- **Real-Time Messaging**: Instant message delivery via Socket.IO
- **Message History**: Paginated conversation history
- **Read Receipts**: Track when messages are read
- **Typing Indicators**: Show when other user is typing
- **Soft Delete**: Messages can be deleted (replaced with "[Message deleted]")
- **Unread Counts**: Track unread messages per conversation
- **Automatic Conversation Creation**: Conversations created on first message

---

## Database Schema

### Conversation Model

```prisma
model Conversation {
  id            String    @id @default(uuid())
  user1Id       String
  user2Id       String
  lastMessageAt DateTime  @default(now())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user1    User      @relation("UserConversations1", fields: [user1Id], references: [id], onDelete: Cascade)
  user2    User      @relation("UserConversations2", fields: [user2Id], references: [id], onDelete: Cascade)
  messages Message[]

  @@unique([user1Id, user2Id]) // Prevent duplicate conversations
  @@index([user1Id])
  @@index([user2Id])
}
```

### Message Model

```prisma
model Message {
  id             String   @id @default(uuid())
  conversationId String
  senderId       String
  receiverId     String
  content        String   @db.Text
  read           Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  receiver     User         @relation("ReceivedMessages", fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([senderId])
  @@index([receiverId])
  @@index([createdAt])
}
```

---

## REST API Endpoints

All chat endpoints require authentication via JWT token.

### 1. Get All Conversations

**Endpoint:** `GET /api/chat/conversations`

**Description:** Retrieve all conversations for the authenticated user with last message preview and unread count.

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "conv-uuid",
    "otherUser": {
      "id": "user-uuid",
      "username": "seller1",
      "email": "seller1@kodo.com",
      "role": "seller"
    },
    "lastMessage": {
      "content": "When can you deliver?",
      "createdAt": "2024-11-14T10:30:00.000Z",
      "read": false,
      "senderId": "user-uuid"
    },
    "lastMessageAt": "2024-11-14T10:30:00.000Z",
    "unreadCount": 2
  }
]
```

---

### 2. Get or Create Conversation

**Endpoint:** `GET /api/chat/conversations/:otherUserId`

**Description:** Get existing conversation with another user or create new one if doesn't exist.

**Authentication:** Required

**Parameters:**
- `otherUserId` (path): User ID to chat with

**Response:**
```json
{
  "id": "conv-uuid",
  "otherUser": {
    "id": "user-uuid",
    "username": "buyer1",
    "email": "buyer1@kodo.com",
    "role": "buyer"
  },
  "lastMessageAt": "2024-11-14T10:00:00.000Z"
}
```

**Error Cases:**
- `400`: Cannot create conversation with yourself
- `404`: Other user not found

---

### 3. Get Messages

**Endpoint:** `GET /api/chat/:conversationId/messages`

**Description:** Get paginated message history for a conversation.

**Authentication:** Required (must be conversation participant)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50, max: 100)

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "conversationId": "conv-uuid",
      "senderId": "user-uuid",
      "sender": {
        "id": "user-uuid",
        "username": "seller1",
        "role": "seller"
      },
      "content": "Hello! I saw your request.",
      "read": true,
      "createdAt": "2024-11-14T09:00:00.000Z",
      "updatedAt": "2024-11-14T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "pages": 1
  }
}
```

**Error Cases:**
- `404`: Conversation not found or access denied

---

### 4. Send Message

**Endpoint:** `POST /api/chat/:conversationId/messages`

**Description:** Send a new message in a conversation. Message is saved to database and delivered in real-time via Socket.IO.

**Authentication:** Required (must be conversation participant)

**Request Body:**
```json
{
  "content": "Hi! Is the product still available?"
}
```

**Validation:**
- `content`: Required, 1-5000 characters

**Response:**
```json
{
  "id": "msg-uuid",
  "conversationId": "conv-uuid",
  "senderId": "user-uuid",
  "receiverId": "other-user-uuid",
  "sender": {
    "id": "user-uuid",
    "username": "buyer1",
    "role": "buyer"
  },
  "content": "Hi! Is the product still available?",
  "read": false,
  "createdAt": "2024-11-14T11:00:00.000Z",
  "updatedAt": "2024-11-14T11:00:00.000Z"
}
```

**Error Cases:**
- `400`: Content empty or too long
- `404`: Conversation not found or access denied

---

### 5. Mark Messages as Read

**Endpoint:** `PUT /api/chat/:conversationId/read`

**Description:** Mark all unread messages in conversation as read.

**Authentication:** Required (must be conversation participant)

**Response:**
```json
{
  "markedAsRead": 3
}
```

**Error Cases:**
- `404`: Conversation not found or access denied

---

### 6. Delete Message

**Endpoint:** `DELETE /api/chat/messages/:messageId`

**Description:** Soft delete a message (replaces content with "[Message deleted]"). Only sender or admin can delete.

**Authentication:** Required (must be sender or admin)

**Response:**
```json
{
  "message": "Message deleted successfully"
}
```

**Error Cases:**
- `404`: Message not found
- `403`: Not authorized to delete

---

## Socket.IO Events

### Client → Server Events

#### 1. `chat:subscribe`

Subscribe to conversation for real-time updates.

**Payload:**
```javascript
socket.emit('chat:subscribe', 'conversation-uuid');
```

**Server Response:**
```javascript
socket.on('chat:subscribed', (data) => {
  console.log('Subscribed to:', data.conversationId);
});
```

---

#### 2. `chat:unsubscribe`

Unsubscribe from conversation.

**Payload:**
```javascript
socket.emit('chat:unsubscribe', 'conversation-uuid');
```

**Server Response:**
```javascript
socket.on('chat:unsubscribed', (data) => {
  console.log('Unsubscribed from:', data.conversationId);
});
```

---

#### 3. `chat:typing`

Notify other user that you're typing.

**Payload:**
```javascript
socket.emit('chat:typing', {
  conversationId: 'conversation-uuid'
});
```

**Server Broadcasts (to other participant):**
```javascript
socket.on('chat:userTyping', (data) => {
  console.log(data.username, 'is typing in', data.conversationId);
});
```

---

#### 4. `chat:stopTyping`

Notify other user that you stopped typing.

**Payload:**
```javascript
socket.emit('chat:stopTyping', {
  conversationId: 'conversation-uuid'
});
```

**Server Broadcasts (to other participant):**
```javascript
socket.on('chat:userStoppedTyping', (data) => {
  console.log('User stopped typing in', data.conversationId);
});
```

---

### Server → Client Events

#### 1. `chat:newMessage`

Receive new message in real-time (emitted when someone sends a message).

**Payload:**
```javascript
socket.on('chat:newMessage', (data) => {
  console.log('New message:', data);
  // {
  //   conversationId: 'conv-uuid',
  //   message: {
  //     id: 'msg-uuid',
  //     content: 'Hello!',
  //     senderId: 'user-uuid',
  //     sender: { id, username, role },
  //     createdAt: '2024-11-14T11:00:00.000Z',
  //     read: false
  //   },
  //   timestamp: '2024-11-14T11:00:00.000Z'
  // }
});
```

---

#### 2. `chat:messagesRead`

Notified when other user reads your messages.

**Payload:**
```javascript
socket.on('chat:messagesRead', (data) => {
  console.log('Messages read:', data);
  // {
  //   conversationId: 'conv-uuid',
  //   readBy: 'user-uuid',
  //   count: 3,
  //   timestamp: '2024-11-14T11:00:00.000Z'
  // }
});
```

---

#### 3. `chat:messageDeleted`

Notified when a message is deleted.

**Payload:**
```javascript
socket.on('chat:messageDeleted', (data) => {
  console.log('Message deleted:', data);
  // {
  //   conversationId: 'conv-uuid',
  //   messageId: 'msg-uuid'
  // }
});
```

---

## Frontend Integration Example

### Vue 3 Composition API Example

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import axios from 'axios';

const socket = ref(null);
const conversations = ref([]);
const currentConversation = ref(null);
const messages = ref([]);
const newMessage = ref('');
const isTyping = ref(false);
const otherUserTyping = ref(false);

// Connect to Socket.IO
onMounted(() => {
  const token = localStorage.getItem('token');
  
  socket.value = io('http://localhost:4000', {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.value.on('connected', (data) => {
    console.log('Connected:', data);
    loadConversations();
  });

  socket.value.on('chat:newMessage', handleNewMessage);
  socket.value.on('chat:messagesRead', handleMessagesRead);
  socket.value.on('chat:userTyping', () => (otherUserTyping.value = true));
  socket.value.on('chat:userStoppedTyping', () => (otherUserTyping.value = false));
});

onUnmounted(() => {
  if (socket.value) socket.value.disconnect();
});

// Load conversations
const loadConversations = async () => {
  const response = await axios.get('/api/chat/conversations', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  conversations.value = response.data;
};

// Open conversation
const openConversation = async (otherUserId) => {
  const response = await axios.get(`/api/chat/conversations/${otherUserId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  currentConversation.value = response.data;
  
  // Subscribe to real-time updates
  socket.value.emit('chat:subscribe', currentConversation.value.id);
  
  // Load messages
  await loadMessages();
};

// Load messages
const loadMessages = async () => {
  const response = await axios.get(
    `/api/chat/${currentConversation.value.id}/messages`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  messages.value = response.data.messages;
  
  // Mark as read
  await axios.put(
    `/api/chat/${currentConversation.value.id}/read`,
    {},
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );
};

// Send message
const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  
  const response = await axios.post(
    `/api/chat/${currentConversation.value.id}/messages`,
    { content: newMessage.value },
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );
  
  messages.value.push(response.data);
  newMessage.value = '';
  stopTyping();
};

// Handle typing
let typingTimeout;
const handleTyping = () => {
  if (!isTyping.value) {
    isTyping.value = true;
    socket.value.emit('chat:typing', {
      conversationId: currentConversation.value.id
    });
  }
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 3000);
};

const stopTyping = () => {
  if (isTyping.value) {
    isTyping.value = false;
    socket.value.emit('chat:stopTyping', {
      conversationId: currentConversation.value.id
    });
  }
};

// Handle new message
const handleNewMessage = (data) => {
  if (data.conversationId === currentConversation.value?.id) {
    messages.value.push(data.message);
    
    // Auto-mark as read
    axios.put(
      `/api/chat/${currentConversation.value.id}/read`,
      {},
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    );
  }
  
  // Update conversation list
  loadConversations();
};

// Handle messages read
const handleMessagesRead = (data) => {
  if (data.conversationId === currentConversation.value?.id) {
    messages.value.forEach(msg => {
      if (msg.senderId === socket.value.user.id) {
        msg.read = true;
      }
    });
  }
};
</script>

<template>
  <div class="chat-container">
    <!-- Conversations List -->
    <div class="conversations">
      <div
        v-for="conv in conversations"
        :key="conv.id"
        @click="openConversation(conv.otherUser.id)"
        class="conversation-item"
      >
        <div class="user-info">
          <strong>{{ conv.otherUser.username }}</strong>
          <span class="badge">{{ conv.otherUser.role }}</span>
        </div>
        <div class="last-message">{{ conv.lastMessage?.content }}</div>
        <span v-if="conv.unreadCount" class="unread-badge">
          {{ conv.unreadCount }}
        </span>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="currentConversation" class="messages">
      <div class="chat-header">
        <strong>{{ currentConversation.otherUser.username }}</strong>
      </div>

      <div class="messages-list">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message', msg.senderId === userId ? 'sent' : 'received']"
        >
          <div class="message-content">{{ msg.content }}</div>
          <div class="message-meta">
            {{ formatTime(msg.createdAt) }}
            <span v-if="msg.senderId === userId && msg.read">✓✓</span>
          </div>
        </div>

        <div v-if="otherUserTyping" class="typing-indicator">
          {{ currentConversation.otherUser.username }} is typing...
        </div>
      </div>

      <div class="message-input">
        <input
          v-model="newMessage"
          @input="handleTyping"
          @keypress.enter="sendMessage"
          placeholder="Type a message..."
        />
        <button @click="sendMessage">Send</button>
      </div>
    </div>
  </div>
</template>
```

---

## Testing

### Test Scenarios

1. **Create Conversation:**
```bash
# User 1 sends first message to User 2
curl -X GET http://localhost:4000/api/chat/conversations/user2-uuid \
  -H "Authorization: Bearer <user1-token>"
```

2. **Send Message:**
```bash
curl -X POST http://localhost:4000/api/chat/conv-uuid/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello! Interested in your product."}'
```

3. **Get Messages:**
```bash
curl -X GET "http://localhost:4000/api/chat/conv-uuid/messages?page=1&limit=50" \
  -H "Authorization: Bearer <token>"
```

4. **Mark as Read:**
```bash
curl -X PUT http://localhost:4000/api/chat/conv-uuid/read \
  -H "Authorization: Bearer <token>"
```

---

## Performance Considerations

1. **Message Pagination:** Default 50 messages per page prevents large payloads
2. **Indexes:** Database indexes on `conversationId`, `senderId`, `receiverId`, `createdAt`
3. **Socket.IO Rooms:** Users only receive messages for subscribed conversations
4. **Unread Count Calculation:** Computed on demand, not stored
5. **Soft Delete:** Messages not physically deleted to preserve conversation history

---

## Security Features

- ✅ JWT authentication required for all chat endpoints
- ✅ Users can only access their own conversations
- ✅ Messages validated (max 5000 characters)
- ✅ Unique constraint prevents duplicate conversations
- ✅ Cascade delete removes messages when conversation deleted
- ✅ Socket.IO authentication on connection
- ✅ Room-based isolation (users only see their messages)

---

## Future Enhancements

- [ ] File/image sharing in chat
- [ ] Voice messages
- [ ] Message reactions (emoji)
- [ ] Message search
- [ ] Conversation archiving
- [ ] Block/mute users
- [ ] Group conversations
- [ ] Push notifications for new messages
- [ ] Message encryption (end-to-end)

---

## Troubleshooting

### Messages Not Delivered in Real-Time

**Issue:** Messages saved to database but not received via Socket.IO

**Solutions:**
1. Check Socket.IO connection: `socket.connected`
2. Verify user subscribed to conversation: `socket.emit('chat:subscribe', conversationId)`
3. Check network tab for WebSocket connection
4. Verify JWT token in Socket.IO auth

### Unread Count Not Updating

**Issue:** Unread count shows incorrect number

**Solutions:**
1. Call `PUT /api/chat/:conversationId/read` when conversation opened
2. Refresh conversations list after receiving new messages
3. Check database for `read` field updates

### Typing Indicator Stuck

**Issue:** "User is typing..." never disappears

**Solutions:**
1. Ensure `chat:stopTyping` event emitted after 3 seconds
2. Clear typing timeout on component unmount
3. Emit `stopTyping` when message sent

---

**Last Updated:** November 14, 2024  
**API Version:** 1.0  
**Socket.IO Version:** 4.x
