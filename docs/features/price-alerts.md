# Price Drop Alerts (Story 005)

## Overview

The Price Drop Alerts feature notifies users when cards on their wishlist drop below their specified maximum price. This helps collectors buy cards at their target prices.

## Features

### Backend

1. **PriceAlert Model** (Prisma)
   - Stores price drop notifications
   - Fields: userId, cardId, oldPrice, newPrice, read, createdAt
   - Indexed by userId, cardId, and read status

2. **Price Check Service** (`/server/src/services/price-check-service.ts`)
   - Checks all wishlist items with maxPrice set
   - Compares against current card prices (priceEur or priceEurFoil)
   - Creates alerts when price drops below maxPrice
   - Prevents duplicate alerts (24-hour window)
   - Emits real-time socket events to users
   - Runs automatically every 6 hours via scheduler

3. **Notifications API** (`/api/notifications`)
   - `GET /api/notifications` - List user's price alerts (paginated)
   - `GET /api/notifications/unread-count` - Get count of unread alerts
   - `PATCH /api/notifications/:id/read` - Mark single alert as read
   - `PATCH /api/notifications/read-all` - Mark all alerts as read
   - `DELETE /api/notifications/:id` - Delete an alert

4. **Real-time Updates**
   - Socket.IO event: `price-alert`
   - Emitted to user's personal room when price drops
   - Client updates notification count in real-time

### Frontend

1. **NotificationBell Component**
   - Badge showing unread count
   - Dropdown menu with notifications list
   - "Mark all as read" button
   - Real-time updates via Socket.IO

2. **NotificationItem Component**
   - Card image thumbnail
   - Old price vs new price with % drop
   - Link to Cardmarket for purchase
   - Mark as read / Delete actions
   - Timestamp (relative format)

3. **Socket Integration**
   - `useSocket` hook for connection management
   - Listens for `price-alert` events
   - Auto-refreshes notification count

## User Flow

1. User adds card to wishlist with maxPrice (e.g., €10.00)
2. Background job checks prices every 6 hours
3. When card price drops to €8.00 (below maxPrice):
   - Alert is created in database
   - Real-time socket event sent to user (if online)
   - User sees badge count update in header
4. User clicks notification bell to see alerts
5. User clicks on alert to see details
6. User clicks "View on Cardmarket" to purchase
7. User marks notification as read or deletes it

## Configuration

### Price Check Interval

Default: 6 hours (configurable in `/server/src/index.ts`):

```typescript
startPriceCheckScheduler(6 * 60 * 60 * 1000); // 6 hours
```

### Manual Price Check

Run price check manually for testing:

```bash
tsx server/scripts/test-price-alerts.ts
```

## Database Schema

```sql
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  old_price FLOAT NOT NULL,
  new_price FLOAT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_card_id ON price_alerts(card_id);
CREATE INDEX idx_price_alerts_read ON price_alerts(read);
```

## API Examples

### Get Notifications

```bash
GET /api/notifications?page=1&pageSize=20&unreadOnly=false
Authorization: Bearer <token>

Response:
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "cardId": "uuid",
      "oldPrice": 10.00,
      "newPrice": 8.00,
      "read": false,
      "createdAt": "2026-02-03T18:00:00Z",
      "card": {
        "id": "uuid",
        "name": "Lightning Bolt",
        "setCode": "LEA",
        "priceEur": 8.00,
        ...
      }
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "unreadCount": 3
}
```

### Mark as Read

```bash
PATCH /api/notifications/:id/read
Authorization: Bearer <token>

Response:
{
  "data": {
    "id": "uuid",
    "read": true,
    ...
  }
}
```

## Testing

### Unit Tests

Test the price check logic:

```typescript
describe('checkWishlistPrices', () => {
  it('should create alert when price drops below maxPrice', async () => {
    // Setup wishlist item with maxPrice: 10
    // Setup card with priceEur: 8
    // Run checkWishlistPrices()
    // Assert alert was created
  });

  it('should not create duplicate alerts within 24 hours', async () => {
    // Create existing alert
    // Run checkWishlistPrices()
    // Assert no new alert created
  });
});
```

### Integration Tests

1. Create user with wishlist item (maxPrice: €10)
2. Update card price to €8
3. Trigger price check
4. Verify alert created
5. Verify socket event emitted
6. Fetch notifications via API
7. Mark as read
8. Delete notification

### Manual Testing

1. Start server: `npm run dev`
2. Login as test user
3. Add card to wishlist with maxPrice
4. Run manual price check: `tsx server/scripts/test-price-alerts.ts`
5. Check notification bell in UI
6. Verify socket connection in DevTools
7. Test mark as read / delete actions

## Performance Considerations

- **Batch Processing**: Price check processes all wishlist items in a single query
- **Duplicate Prevention**: Checks for existing alerts within 24 hours to avoid spam
- **Socket Rooms**: Uses user-specific rooms for targeted notifications
- **Pagination**: Notifications API supports pagination for large lists
- **Indexes**: Database indexes on userId, cardId, and read status for fast queries

## Future Enhancements

- Email notifications for price drops (optional setting)
- Price history charts in notifications
- Custom price check intervals per user
- Bulk delete/mark as read
- Push notifications (PWA)
- Price drop threshold (e.g., only notify if >10% drop)
- Notification preferences (min/max price drop amount)
