# ADR-004: JWT for Authentication

## Status

**Accepted** - January 2025

## Context

We need an authentication mechanism for the MTG Binder application that supports:
- User login/registration
- Protected API endpoints
- WebSocket authentication
- Mobile-friendly (PWA)

### Options Considered

1. **JWT (JSON Web Tokens)** - Stateless tokens
2. **Session Cookies** - Server-side sessions
3. **OAuth 2.0 / OpenID Connect** - Delegated auth
4. **API Keys** - Static credentials

## Decision

We will use **JWT (JSON Web Tokens)** for authentication with:
- Short-lived access tokens (7 days default)
- bcrypt for password hashing
- No refresh tokens (simplified approach for hobbyist app)

## Rationale

### Why JWT

| Factor | JWT | Sessions | OAuth |
|--------|-----|----------|-------|
| Stateless | Yes | No | Depends |
| Mobile-friendly | Yes | Complex | Yes |
| WebSocket auth | Easy | Complex | Possible |
| Server memory | None | Per-session | None |
| Horizontal scaling | Simple | Needs Redis | Simple |
| Implementation | Simple | Simple | Complex |

### Key Advantages

1. **Stateless**: No server-side session storage needed
   ```typescript
   // Verification is self-contained
   const payload = jwt.verify(token, config.jwtSecret);
   // No database lookup required for auth check
   ```

2. **WebSocket Compatible**: Pass in handshake
   ```typescript
   const socket = io(SERVER_URL, {
     auth: { token: localStorage.getItem('token') }
   });
   ```

3. **Cross-Service Ready**: If we add services later, same token works

4. **Mobile/PWA Friendly**: Works with localStorage, no cookie complexity

### Why NOT Session Cookies

Session cookies would require:
- Server-side session store (Redis for multiple instances)
- Cookie handling complexity for CORS
- Separate WebSocket auth mechanism
- Session affinity for load balancing

### Why NOT OAuth

OAuth (Google/GitHub login) adds:
- External dependency on auth providers
- Complexity for a personal/hobbyist app
- Users may not want to link accounts

Could be added later if needed, but not for MVP.

## Implementation

### Token Structure

```typescript
// Payload stored in JWT
interface JWTPayload {
  userId: string;  // User's UUID
  iat: number;     // Issued at timestamp
  exp: number;     // Expiration timestamp
}
```

### Token Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Login  │ ──► │  Token  │ ──► │   Use   │
│         │     │ Created │     │  Token  │
└─────────┘     └─────────┘     └────┬────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
              Token Valid                      Token Expired
                    │                                 │
              ┌─────▼─────┐                   ┌───────▼───────┐
              │  Access   │                   │   Re-login    │
              │  Granted  │                   │   Required    │
              └───────────┘                   └───────────────┘
```

### Security Measures

1. **Strong Secret Required**
   ```typescript
   // config.ts throws if JWT_SECRET is missing
   jwtSecret: requireEnv('JWT_SECRET'),
   ```

2. **Password Hashing**
   ```typescript
   // 12 rounds of bcrypt
   const hash = await bcrypt.hash(password, 12);
   ```

3. **Token Expiration**
   ```typescript
   jwt.sign({ userId }, secret, { expiresIn: '7d' });
   ```

4. **User Lookup on Protected Routes**
   ```typescript
   // Verify user still exists (not deleted)
   const user = await prisma.user.findUnique({
     where: { id: decoded.userId }
   });
   ```

## API Usage

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "data": {
    "user": { "id": "...", "email": "...", "displayName": "..." },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Protected Request

```http
GET /api/collection
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### WebSocket Authentication

```typescript
// Client
const socket = io(SERVER_URL, {
  auth: { token: userToken }
});

// Server middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, config.jwtSecret);
  socket.userId = decoded.userId;
  next();
});
```

## Consequences

### Positive

- ✅ Stateless - no session store needed
- ✅ Works seamlessly with WebSockets
- ✅ Simple implementation
- ✅ Mobile/PWA compatible
- ✅ Horizontal scaling without shared state

### Negative

- ❌ Cannot invalidate tokens server-side (until expiry)
- ❌ Token size larger than session ID
- ❌ Secret rotation requires re-auth of all users

### Accepted Trade-offs

1. **No Token Revocation**: For a hobbyist app, if a user's token is compromised, they can change their password and wait for expiry. For higher security needs, add a token blacklist in Redis.

2. **No Refresh Tokens**: Simpler implementation. Users re-login after 7 days. Could add refresh tokens if UX feedback demands it.

3. **Token in localStorage**: Vulnerable to XSS. Mitigated by:
   - Helmet security headers
   - No eval/innerHTML usage
   - CSP headers (future improvement)

## Future Considerations

If security requirements increase:

1. **Add Refresh Tokens**
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7 days, rotated)
   - Refresh token stored in httpOnly cookie

2. **Add Token Blacklist**
   - Redis set of revoked token IDs
   - Check on each request
   - For logout/password change

3. **Add OAuth Providers**
   - Google, GitHub login options
   - Link to existing accounts

## References

- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet_for_Java.html)
- [bcrypt Cost Factor](https://security.stackexchange.com/questions/17207/recommended-of-rounds-for-bcrypt)
