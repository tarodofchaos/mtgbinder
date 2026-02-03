# Story 009 - In-Session Trade Messaging - Testing Guide

## Overview
This document provides manual testing steps for the trade messaging feature implemented in Story 009.

## Prerequisites
- Server running on http://localhost:5000
- Client running on http://localhost:3000
- Two user accounts registered
- At least one active trade session between the users

## Test Scenarios

### 1. Chat Panel Display
**Steps:**
1. User A creates a trade session
2. User B joins the trade session using the session code
3. Both users navigate to the trade session page

**Expected:**
- Chat panel is visible on the trade session page
- Chat panel shows "No messages yet. Start the conversation!" message
- Input field and send button are enabled

### 2. Send Message
**Steps:**
1. User A types a message in the input field
2. User A clicks the send button or presses Enter

**Expected:**
- Message appears in User A's chat with their avatar on the right
- Message has blue background (primary color)
- Timestamp is displayed
- Input field is cleared
- Message appears in real-time on User B's screen with their avatar on the left

### 3. Receive Message
**Steps:**
1. User B sends a message
2. Observe User A's chat panel

**Expected:**
- Message appears in User A's chat immediately
- Message has grey background
- Sender's avatar and name are displayed on the left
- Timestamp is shown

### 4. Typing Indicator
**Steps:**
1. User A starts typing in the input field
2. Observe User B's chat panel

**Expected:**
- "Partner is typing..." indicator appears at bottom of User B's chat
- Indicator disappears 1 second after User A stops typing
- Indicator disappears immediately when User A sends the message

### 5. Message History
**Steps:**
1. User A sends multiple messages
2. User B sends multiple messages
3. User A refreshes the page or navigates away and back

**Expected:**
- All messages are preserved and displayed in chronological order
- Messages maintain correct sender association
- Scroll position is at the bottom showing most recent messages

### 6. Auto-Scroll
**Steps:**
1. Send enough messages to make chat scrollable (more than can fit on screen)
2. Send a new message

**Expected:**
- Chat automatically scrolls to show the newest message
- Smooth scrolling animation

### 7. Message Validation
**Steps:**
1. Try to send an empty message (spaces only)
2. Try to send a very long message (>1000 characters)

**Expected:**
- Empty messages are not sent
- Long messages are truncated to 1000 characters (enforced by maxLength)
- Send button is disabled when input is empty

### 8. Socket Connection
**Steps:**
1. Open browser DevTools Network tab
2. Join a trade session
3. Observe WebSocket connection

**Expected:**
- WebSocket connection established to Socket.IO server
- "User joined trade session room" logged on server
- Connection persists during the session

### 9. Error Handling
**Steps:**
1. Disconnect from internet
2. Try to send a message
3. Reconnect to internet

**Expected:**
- Send button becomes disabled when disconnected
- Message queue is NOT maintained (messages sent while disconnected are lost)
- Upon reconnection, chat functions normally

### 10. Multiple Sessions
**Steps:**
1. User A has trade sessions with both User B and User C
2. User A navigates between different trade session pages

**Expected:**
- Messages are isolated per session
- Switching sessions shows correct message history
- User A doesn't see messages from other sessions

## API Endpoints to Test

### GET /api/trade/:code/messages
```bash
# Get message history for a session
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/trade/ABC123/messages?limit=50
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "senderId": "uuid",
      "content": "Hello!",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "sender": {
        "id": "uuid",
        "displayName": "User A",
        "shareCode": "ABC123"
      }
    }
  ]
}
```

## Socket Events to Test

### Sending a Message
```javascript
socket.emit('trade-message', {
  sessionCode: 'ABC123',
  content: 'Hello!'
});
```

**Expected Server Response:**
- Broadcast to all users in `trade:ABC123` room
- Event: `trade-message`
- Payload includes full message object with sender info

### Typing Indicator
```javascript
socket.emit('trade-typing', {
  sessionCode: 'ABC123',
  isTyping: true
});
```

**Expected Server Response:**
- Broadcast to other users in room (not sender)
- Event: `trade-typing`
- Payload: `{ userId: 'uuid', isTyping: true }`

## Database Verification

### Check Messages Table
```sql
SELECT * FROM trade_messages
WHERE session_id = '<session-id>'
ORDER BY created_at ASC;
```

**Expected:**
- Messages stored with correct session_id
- sender_id matches the user who sent the message
- content is trimmed and validated
- created_at timestamps are in correct order

## Acceptance Criteria Checklist

- [x] 1. Chat panel visible during active trade session
- [x] 2. Real-time message delivery via Socket.IO
- [x] 3. Show typing indicators
- [x] 4. Messages persist in database
- [x] 5. Show message history when rejoining session

## Known Limitations

1. **No message editing** - Messages cannot be edited after sending
2. **No message deletion** - Messages cannot be deleted
3. **No read receipts** - No indication when partner has read messages
4. **No file attachments** - Only text messages supported
5. **Message limit** - Maximum 1000 characters per message
6. **History limit** - API returns max 100 messages (default 50)

## Performance Considerations

- Messages are loaded once on page load, not paginated
- Real-time updates use Socket.IO broadcast (efficient for small groups)
- Auto-scroll happens on every new message (could impact performance with many messages)
- No message deduplication (if same message received multiple times, all appear)

## Security Considerations

- Messages are validated server-side (max length, XSS protection via React)
- Users must be part of trade session to send/view messages
- Socket events verify session membership before processing
- No sensitive data should be shared in messages (warn users)
