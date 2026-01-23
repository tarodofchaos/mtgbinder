# ADR-003: Socket.IO for Real-Time Trading

## Status

**Accepted** - January 2025

## Context

The MTG Binder application includes a real-time trading feature where two users:
1. Create/join a trading session via QR code
2. See live updates when their partner joins
3. View real-time trade match calculations
4. Receive notifications when the session completes

We need to choose how to implement real-time communication.

### Options Considered

1. **Socket.IO** - WebSocket abstraction with fallbacks
2. **Native WebSockets** - Browser WebSocket API
3. **Server-Sent Events (SSE)** - One-way server push
4. **Long Polling** - HTTP-based polling
5. **Third-party service** - Pusher, Ably, Firebase

## Decision

We will use **Socket.IO** for real-time communication.

## Rationale

### Feature Comparison

| Feature | Socket.IO | WebSocket | SSE | Polling |
|---------|-----------|-----------|-----|---------|
| Bidirectional | Yes | Yes | No | Simulated |
| Auto-reconnect | Yes | Manual | Manual | Yes |
| Fallback transports | Yes | No | No | N/A |
| Room/namespace support | Yes | Manual | Manual | Manual |
| Built-in auth middleware | Yes | Manual | Manual | Manual |
| Binary data | Yes | Yes | No | Limited |
| Browser support | 100% | 98%+ | 95%+ | 100% |

### Why Socket.IO

1. **Room-based architecture**: Perfect for trading sessions
   ```typescript
   socket.join(`trade:${sessionCode}`);
   io.to(`trade:${sessionCode}`).emit('matches-updated', data);
   ```

2. **Authentication middleware**: Clean integration with JWT
   ```typescript
   io.use((socket, next) => {
     const token = socket.handshake.auth.token;
     // Verify JWT and attach userId
   });
   ```

3. **Automatic fallbacks**: Works even behind restrictive firewalls
   - WebSocket (preferred)
   - HTTP long-polling (fallback)

4. **Reconnection handling**: Built-in with exponential backoff

5. **Mature ecosystem**: Well-documented, battle-tested

### Why NOT Native WebSockets

While simpler, native WebSockets require:
- Manual reconnection logic
- Manual room/channel management
- No fallback for restrictive networks
- More client-side code

For a small team, Socket.IO's abstractions save significant development time.

### Why NOT Server-Sent Events

SSE is one-way (server → client). Trading requires bidirectional:
- Client → Server: "Join session", "Leave session"
- Server → Client: "Partner joined", "Matches updated"

Would need separate REST endpoints for client-to-server messages.

### Why NOT Third-Party Services

Pusher/Ably/Firebase would add:
- External dependency
- Monthly costs ($50+/month at scale)
- Data leaving our infrastructure
- Additional API to learn

For our scale, self-hosted Socket.IO is sufficient and free.

## Architecture

### Server-Side

```
┌─────────────────────────────────────────────────┐
│                 HTTP Server                      │
├─────────────────────────────────────────────────┤
│              Socket.IO Server                    │
│  ┌─────────────────────────────────────────┐    │
│  │           Authentication                 │    │
│  │        (JWT verification)               │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │              Rooms                       │    │
│  │   user:{userId}    trade:{sessionCode}  │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Room Strategy

| Room Pattern | Purpose | Example |
|--------------|---------|---------|
| `user:{id}` | Personal notifications | `user:abc123` |
| `trade:{code}` | Trading session | `trade:XYZ789` |

### Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join-trade-session` | Client → Server | Join a session room |
| `leave-trade-session` | Client → Server | Leave a session room |
| `trade:user-joined` | Server → Client | Partner joined |
| `trade:matches-updated` | Server → Client | New match data |
| `trade:session-completed` | Server → Client | Session finished |

## Consequences

### Positive

- ✅ Simple room-based broadcasting
- ✅ Built-in reconnection handling
- ✅ Works behind corporate firewalls
- ✅ Type-safe with TypeScript
- ✅ Co-located with HTTP server (single deployment)
- ✅ No external service costs

### Negative

- ❌ Sticky sessions needed for load balancing
- ❌ Memory usage for connection state
- ❌ Horizontal scaling requires Redis adapter

### Scaling Considerations

Current single-server setup handles 1000+ concurrent WebSocket connections easily.

For horizontal scaling (multiple server instances):
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

This is not implemented yet as single-server is sufficient.

## Security Measures

1. **JWT authentication**: Connections require valid token
2. **Input validation**: Session codes sanitized
3. **Error handling**: Try-catch on all event handlers
4. **Rate limiting**: Handled at HTTP level (same server)

## References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO vs WebSocket](https://socket.io/docs/v4/how-it-works/)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
