# Frontend Chat Hierarchy Implementation Guide

## Overview

This guide provides complete instructions for implementing the chat hierarchy system on the frontend. The backend enforces strict messaging permissions based on user roles and organizational boundaries (region, area, territory, dealer).

---

## 📋 Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Chat Hierarchy Rules](#chat-hierarchy-rules)
3. [Implementation Steps](#implementation-steps)
4. [WebSocket Integration](#websocket-integration)
5. [UI/UX Considerations](#uiux-considerations)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)

---

## 🔌 API Endpoints

### 1. Get Allowed Users
**Endpoint:** `GET /api/chat/allowed-users`

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "roleId": 8,
      "dealerId": "uuid-or-null",
      "regionId": "uuid-or-null",
      "areaId": "uuid-or-null",
      "territoryId": "uuid-or-null",
      "roleName": "dealer_admin"
    }
  ]
}
```

**Usage:**
- Call this endpoint when the user opens the chat interface
- Use the returned list to populate the "Contacts" or "Start Conversation" list
- Only users in this list can be messaged (backend enforces this)

---

### 2. Send Message
**Endpoint:** `POST /api/chat/send`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "recipientId": "uuid",
  "body": "Message text here"
}
```

**Response:**
```json
{
  "message": {
    "id": "uuid",
    "senderId": "uuid",
    "recipientId": "uuid",
    "body": "Message text here",
    "status": "unread",
    "messageType": "chat",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Missing recipientId or body
- `403`: Not allowed to message this user (permission denied)
- `500`: Server error

---

### 3. Get Conversation
**Endpoint:** `GET /api/chat/conversation/:partnerId`

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "senderId": "uuid",
      "recipientId": "uuid",
      "body": "Message text",
      "status": "read",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "sender": {
        "id": "uuid",
        "username": "john_doe",
        "role": "dealer_admin"
      },
      "recipient": {
        "id": "uuid",
        "username": "jane_smith",
        "role": "dealer_staff"
      }
    }
  ]
}
```

---

### 4. Mark Messages as Read
**Endpoint:** `PATCH /api/chat/:partnerId/read`

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "success": true,
  "updated": 5
}
```

---

### 5. Get Unread Count
**Endpoint:** `GET /api/chat/unread-count`

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "count": 3
}
```

---

## 📊 Chat Hierarchy Rules

### Role-Based Messaging Permissions

#### 1️⃣ SUPER ADMIN
- ✅ **CAN message:** Everyone (no restrictions)
- **UI Behavior:** Show all users in the system

#### 2️⃣ TECHNICAL ADMIN
- ✅ **CAN message:** Super Admin, Regional Admin, Regional Manager, Finance Admin, Dealer Admin
- ❌ **CANNOT message:** Dealer Staff, Territory Manager, Area Manager
- **UI Behavior:** Filter out dealer_staff, territory_manager, area_manager from allowed users

#### 3️⃣ REGIONAL ADMIN
- ✅ **CAN message:** Super Admin, Technical Admin, Finance Admin, Regional Manager, Area Managers, Territory Managers, Dealer Admins, Dealer Staff (in their region)
- **UI Behavior:** Show users scoped to their region

#### 4️⃣ REGIONAL MANAGER
- ✅ **CAN message:** Regional Admin, Technical Admin, Super Admin, Area Managers, Territory Managers, Dealer Admins, Dealer Staff (in their region)
- ❌ **CANNOT message:** Users from other regions
- **UI Behavior:** Show only users from their region

#### 5️⃣ AREA MANAGER
- ✅ **CAN message:** Regional Manager, Regional Admin, Territory Manager, Dealer Admins, Dealer Staff, Super Admin (for escalation)
- **UI Behavior:** Show users from their area/region

#### 6️⃣ TERRITORY MANAGER
- ✅ **CAN message:** Area Manager, Regional Manager, Dealer Admins (in assigned territory), Dealer Staff (for operations), Finance Admin (rare), Super Admin (escalations)
- ❌ **CANNOT message:** Other territories, Other areas
- **UI Behavior:** Show only users from their assigned territory

#### 7️⃣ DEALER ADMIN
- ✅ **CAN message:** Dealer Staff, Territory Manager, Area Manager, Regional Manager, Regional Admin, Finance Admin, Technical Admin, Super Admin
- ❌ **CANNOT message:** Other dealers (unless special permission)
- **UI Behavior:** Show their dealer staff + managers in their hierarchy

#### 8️⃣ DEALER STAFF
- ✅ **CAN message:** Dealer Admin, Territory Manager, Area Manager, Regional Manager, Regional Admin, Technical Admin (system issues), Super Admin (escalation)
- ❌ **CANNOT message:** Other dealer staff from different dealerships, Other dealer admins
- **UI Behavior:** Show only their dealer admin + managers in their hierarchy

#### 9️⃣ FINANCE ADMIN
- ✅ **CAN message:** Super Admin, Technical Admin, Regional Admin, Dealer Admin, Accounts User, Territory / Area Managers (for clarifications)
- ❌ **CANNOT message:** Dealer Staff directly (unless needed)
- **UI Behavior:** Filter out dealer_staff from allowed users

#### 🔟 ACCOUNTS USER
- ✅ **CAN message:** Finance Admin, Dealer Admin, Territory Manager
- ❌ **CANNOT message:** Super Admin, Technical Admin
- **UI Behavior:** Show only finance_admin, dealer_admin, territory_manager

#### 1️⃣1️⃣ INVENTORY USER
- ✅ **CAN message:** Dealer Admin, Territory Manager, Area Manager, Regional Manager
- **UI Behavior:** Show operational contacts only

---

## 🚀 Implementation Steps

### Step 1: Fetch Allowed Users on Chat Load

```javascript
// Example: React Hook
const [allowedUsers, setAllowedUsers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchAllowedUsers = async () => {
    try {
      const response = await fetch('/api/chat/allowed-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllowedUsers(data.users);
      } else {
        console.error('Failed to fetch allowed users');
      }
    } catch (error) {
      console.error('Error fetching allowed users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchAllowedUsers();
}, [token]);
```

### Step 2: Display Contacts List

```javascript
// Filter and group users by role for better UX
const groupedUsers = allowedUsers.reduce((acc, user) => {
  const role = user.roleName || 'other';
  if (!acc[role]) acc[role] = [];
  acc[role].push(user);
  return acc;
}, {});

// Display grouped contacts
Object.entries(groupedUsers).map(([role, users]) => (
  <div key={role}>
    <h3>{formatRoleName(role)}</h3>
    {users.map(user => (
      <ContactItem 
        key={user.id} 
        user={user}
        onClick={() => openConversation(user.id)}
      />
    ))}
  </div>
));
```

### Step 3: Send Message with Validation

```javascript
const sendMessage = async (recipientId, messageBody) => {
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientId,
        body: messageBody
      })
    });
    
    if (response.status === 403) {
      // Permission denied - show user-friendly error
      showError('You are not allowed to message this user');
      return;
    }
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error sending message:', error);
    showError('Failed to send message. Please try again.');
  }
};
```

### Step 4: Load Conversation

```javascript
const loadConversation = async (partnerId) => {
  try {
    const response = await fetch(`/api/chat/conversation/${partnerId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setMessages(data.messages);
      
      // Mark messages as read
      await markAsRead(partnerId);
    }
  } catch (error) {
    console.error('Error loading conversation:', error);
  }
};
```

---

## 🔌 WebSocket Integration

### Socket.IO Events

The backend uses Socket.IO for real-time messaging. Connect and handle events:

```javascript
import io from 'socket.io-client';

// Initialize socket connection
const socket = io('http://your-backend-url', {
  auth: {
    token: userToken
  }
});

// Join user's personal room
socket.emit('join_user_room', { userId: currentUser.id });

// Listen for new messages
socket.on('receive_message', (message) => {
  // Update UI with new message
  addMessageToConversation(message);
  
  // Show notification if not in current conversation
  if (message.senderId !== currentPartnerId) {
    showNotification(`New message from ${message.sender.username}`);
  }
});

// Listen for message notifications
socket.on('new_message_notification', (notification) => {
  showNotification(notification.preview);
  updateUnreadCount();
});

// Send message via socket (with permission check)
socket.emit('send_message', {
  senderId: currentUser.id,
  recipientId: partnerId,
  body: messageText,
  subject: ''
});

// Handle message sent confirmation
socket.on('message_sent', (data) => {
  console.log('Message sent:', data);
  // Update UI to show sent message
});

// Handle message errors
socket.on('message_error', (error) => {
  if (error.error === 'not_allowed_to_message_user') {
    showError('You are not allowed to message this user');
  } else if (error.error === 'missing_required_fields') {
    showError('Please fill in all required fields');
  } else {
    showError('Failed to send message. Please try again.');
  }
});

// Typing indicator
const handleTyping = (isTyping) => {
  socket.emit('typing', {
    user1: currentUser.id,
    user2: partnerId,
    isTyping
  });
};

socket.on('typing', (data) => {
  if (data.userId === partnerId) {
    showTypingIndicator(data.isTyping);
  }
});
```

---

## 🎨 UI/UX Considerations

### 1. Contact List Filtering
- **Group by Role:** Group contacts by role (e.g., "Managers", "Dealers", "Admins")
- **Search/Filter:** Add search functionality to find users quickly
- **Online Status:** Show online/offline status if available
- **Unread Badges:** Show unread message count next to each contact

### 2. Permission Indicators
- **Visual Cues:** Show icons or badges indicating user roles
- **Disabled State:** If a user is not in allowed list, show them as disabled/grayed out
- **Tooltips:** Explain why certain users cannot be messaged (e.g., "Only users in your region")

### 3. Error Messages
- **User-Friendly:** Translate backend errors to user-friendly messages
- **Actionable:** Suggest what the user can do (e.g., "Contact your Regional Admin for access")

### 4. Real-Time Updates
- **Live Messages:** Update conversation in real-time when new messages arrive
- **Typing Indicators:** Show when the other person is typing
- **Read Receipts:** Show when messages are read (if implemented)

### 5. Conversation Management
- **Active Conversations:** Show list of active conversations
- **Unread Count:** Display total unread messages in header
- **Message Status:** Show sent/delivered/read status

---

## ⚠️ Error Handling

### Common Error Scenarios

1. **403 Forbidden (Permission Denied)**
   ```javascript
   if (response.status === 403) {
     showError('You do not have permission to message this user. Please contact your administrator.');
   }
   ```

2. **User Not in Allowed List**
   ```javascript
   // Before sending, check if user is in allowed list
   const canMessage = allowedUsers.some(u => u.id === recipientId);
   if (!canMessage) {
     showError('This user is not available for messaging based on your role permissions.');
     return;
   }
   ```

3. **Network Errors**
   ```javascript
   try {
     // API call
   } catch (error) {
     if (error.message === 'Failed to fetch') {
       showError('Network error. Please check your connection.');
     } else {
       showError('An unexpected error occurred. Please try again.');
     }
   }
   ```

4. **Socket Connection Errors**
   ```javascript
   socket.on('connect_error', (error) => {
     console.error('Socket connection error:', error);
     showError('Connection lost. Attempting to reconnect...');
   });
   
   socket.on('disconnect', (reason) => {
     if (reason === 'io server disconnect') {
       // Server disconnected, need to reconnect manually
       socket.connect();
     }
   });
   ```

---

## 💻 Code Examples

### Complete React Chat Component Example

```javascript
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const ChatComponent = ({ currentUser, token }) => {
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize socket
  useEffect(() => {
    const newSocket = io('http://your-backend-url', {
      auth: { token }
    });
    
    newSocket.emit('join_user_room', { userId: currentUser.id });
    
    newSocket.on('receive_message', (message) => {
      if (selectedUser && message.senderId === selectedUser.id) {
        setMessages(prev => [...prev, message]);
      } else {
        setUnreadCount(prev => prev + 1);
      }
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, [token, currentUser.id]);

  // Fetch allowed users
  useEffect(() => {
    fetch('/api/chat/allowed-users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => setAllowedUsers(data.users))
      .catch(err => console.error('Error fetching users:', err));
  }, [token]);

  // Load conversation when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetch(`/api/chat/conversation/${selectedUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => res.json())
        .then(data => {
          setMessages(data.messages);
          markAsRead(selectedUser.id);
        })
        .catch(err => console.error('Error loading conversation:', err));
    }
  }, [selectedUser, token]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: selectedUser.id,
          body: newMessage
        })
      });

      if (response.status === 403) {
        alert('You are not allowed to message this user');
        return;
      }

      if (!response.ok) throw new Error('Failed to send');

      const data = await response.json();
      setMessages(prev => [...prev, data.message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const markAsRead = async (partnerId) => {
    try {
      await fetch(`/api/chat/${partnerId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="contacts-sidebar">
        <h2>Contacts ({allowedUsers.length})</h2>
        {allowedUsers.map(user => (
          <div
            key={user.id}
            className={`contact-item ${selectedUser?.id === user.id ? 'active' : ''}`}
            onClick={() => setSelectedUser(user)}
          >
            <div className="contact-name">{user.username}</div>
            <div className="contact-role">{user.roleName}</div>
          </div>
        ))}
      </div>

      <div className="conversation-area">
        {selectedUser ? (
          <>
            <div className="conversation-header">
              <h3>{selectedUser.username}</h3>
              <span className="role-badge">{selectedUser.roleName}</span>
            </div>
            
            <div className="messages-list">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`message ${msg.senderId === currentUser.id ? 'sent' : 'received'}`}
                >
                  <div className="message-body">{msg.body}</div>
                  <div className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            <p>Select a contact to start a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatComponent;
```

---

## ✅ Testing Checklist

- [ ] Fetch allowed users on chat load
- [ ] Display only users that current user can message
- [ ] Send message via REST API
- [ ] Send message via WebSocket
- [ ] Handle permission denied errors (403)
- [ ] Load conversation history
- [ ] Mark messages as read
- [ ] Real-time message updates
- [ ] Typing indicators
- [ ] Unread message count
- [ ] Network error handling
- [ ] Socket reconnection handling
- [ ] Group contacts by role
- [ ] Search/filter contacts
- [ ] Mobile responsiveness

---

## 📝 Notes

1. **Always validate on frontend AND backend:** The frontend should check allowed users before showing contacts, but the backend enforces the actual permissions.

2. **Cache allowed users:** Consider caching the allowed users list and refreshing periodically, as role assignments may change.

3. **Handle role changes:** If a user's role changes, refresh the allowed users list.

4. **Optimize for large lists:** If there are many allowed users, implement pagination or virtual scrolling.

5. **Accessibility:** Ensure keyboard navigation and screen reader support for the chat interface.

---

## 🔗 Related Endpoints

- User Profile: `GET /api/users/me` (to get current user's role)
- Notifications: `GET /api/notifications` (for message notifications)

---

**Need Help?** Contact the backend team for API changes or permission clarifications.

