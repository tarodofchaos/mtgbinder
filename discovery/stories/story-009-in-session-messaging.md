# Story: 009 - In-Session Trade Messaging

**As a** trader in an active session
**I want to** send messages to my trading partner
**So that** we can negotiate and coordinate the trade

**Story Points:** 5
**Priority:** Medium
**Epic:** Trade Session Enhancements

## Acceptance Criteria

### AC1: Message input
**Given** I am in an active trade session
**When** I view the session page
**Then** I see a chat/message input area

### AC2: Send message
**Given** I am in a trade session
**When** I type a message and press send
**Then** the message appears in the chat for both users

### AC3: Real-time delivery
**Given** my trading partner sends a message
**When** the message is sent
**Then** I see it immediately without refreshing (via Socket.IO)

### AC4: Message history
**Given** I am in a trade session
**When** messages are exchanged
**Then** I can scroll through the message history

### AC5: Message persistence
**Given** I refresh the trade session page
**When** the page reloads
**Then** previous messages are still visible

### AC6: Typing indicator
**Given** my partner is typing
**When** they type in the input
**Then** I see a "Partner is typing..." indicator

## Technical Notes
- New `TradeMessage` model: id, sessionId, senderId, content, timestamp
- Extend Socket.IO service with message events
- Use existing socket connection from trade session
- Limit message length to 500 characters

## Dependencies
- Existing Socket.IO infrastructure
- TradeSession model

## Out of Scope
- Image/file sharing
- Message reactions
- Read receipts
