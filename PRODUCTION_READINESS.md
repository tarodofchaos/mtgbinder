# Production Readiness Plan: MTG Binder

This document outlines the high-priority changes required to transition MTG Binder from beta to a stable, scalable production environment.

## 🔴 Phase 1: Critical Security & Data Integrity (Highest Priority)

### 1. Secure Password Reset Tokens
*   **Problem:** Reset tokens are currently stored in plain text in the database.
*   **Action:** Hash the `resetToken` before saving (e.g., using SHA-256) and verify the hash during the reset process.
*   **File:** `server/src/routes/auth.ts`

### 2. Socket.IO Spam Prevention
*   **Problem:** No rate limiting on `trade-message` or `trade-typing` events.
*   **Action:** Implement a simple middleware for Socket.IO to limit the frequency of messages per user/session.
*   **File:** `server/src/services/socket-service.ts`

### 3. Collection Stats Optimization
*   **Problem:** `getCollectionStats` fetches all items and calculates totals in JS memory. This will crash or hang for large collections.
*   **Action:** Use Prisma's `aggregate` and `groupBy` to perform calculations (sum, count) at the database level.
*   **File:** `server/src/routes/collection.ts`

---

## 🟡 Phase 2: Performance & Scalability (Medium Priority)

### 4. Database Search Optimization (FTS)
*   **Problem:** Card search uses `ILIKE %q%` which is extremely slow on large tables (100k+ rows).
*   **Action:** Implement PostgreSQL Full-Text Search (FTS) with a `tsvector` column and a `GIN` index on `name` and `nameEs`.
*   **Files:** `server/prisma/schema.prisma`, `server/src/routes/cards.ts`

### 5. Reliable "Latest Printing" Logic
*   **Problem:** Sorting by `setCode DESC` is alphabetically inconsistent (e.g., `VOW` vs `MID`).
*   **Action:** Add a `releasedAt` DateTime field to the `Card` model during import and use it for sorting in `resolveCardNames`.
*   **Files:** `server/prisma/schema.prisma`, `server/src/services/data-update-service.ts`, `server/src/services/import-service.ts`

---

## 🔵 Phase 3: UX & Monitoring (Lower Priority)

### 6. Global Error Boundary
*   **Problem:** A single React crash in a component (e.g., a null scryfallId) can break the entire app.
*   **Action:** Add a high-level `ErrorBoundary` component to catch and display a "Something went wrong" UI.
*   **File:** `client/src/App.tsx`

### 7. Private Binder Enforcement
*   **Problem:** Private binders are still accessible via direct link if the `shareCode` is known.
*   **Action:** Verify the `isPublic` flag in the public binder route and block access if `false` (unless the viewer is the owner).
*   **File:** `server/src/routes/binder.ts`

### 8. Metrics Protection
*   **Problem:** `/metrics` endpoint is public and exposes internal system data.
*   **Action:** Restrict access to `/metrics` using a simple API key or internal IP whitelist.
*   **File:** `server/src/index.ts`
