# MTG-005 Testing Guide: Price Drop Alerts

## Quick Start

### Prerequisites
1. Database migrated: `npm run db:migrate`
2. Server running: `npm run dev`
3. Test user account created

### Test Scenario 1: Basic Price Alert

**Goal**: Verify that a price alert is created and displayed when a card's price drops below maxPrice.

**Steps**:
1. Login as test user
2. Navigate to Wishlist page
3. Add a card to wishlist:
   - Search for any card (e.g., "Lightning Bolt")
   - Set `maxPrice` to €10.00
   - Set quantity to 1
   - Click "Add to Wishlist"
4. Manually update the card's price in database:
   ```sql
   UPDATE cards
   SET price_eur = 8.00
   WHERE name LIKE '%Lightning Bolt%'
   LIMIT 1;
   ```
5. Trigger price check manually:
   ```bash
   tsx server/scripts/test-price-alerts.ts
   ```
6. Check server logs for alert creation
7. Refresh the page (or wait for socket event)
8. Verify notification bell shows badge count "1"
9. Click notification bell
10. Verify alert shows:
    - Card image
    - "Lightning Bolt"
    - Old price: €10.00 (crossed out)
    - New price: €8.00 (green)
    - Percentage: -20%
    - Cardmarket link
    - Timestamp

**Expected Result**: ✅ Alert appears with correct details

---

### Test Scenario 2: Real-time Socket Update

**Goal**: Verify that notifications appear in real-time via Socket.IO.

**Steps**:
1. Open two browser tabs with same user logged in
2. In Tab 1: Keep notification bell open
3. In Tab 2 (terminal):
   ```bash
   # Add card to wishlist with maxPrice via API
   curl -X POST http://localhost:5000/api/wishlist \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "cardId": "CARD_UUID",
       "maxPrice": 15.00,
       "quantity": 1
     }'

   # Update card price to trigger alert
   psql -d mtg_binder -c "UPDATE cards SET price_eur = 12.00 WHERE id = 'CARD_UUID';"

   # Trigger price check
   tsx server/scripts/test-price-alerts.ts
   ```
4. In Tab 1: Watch notification bell
5. Verify badge count updates **without page refresh**

**Expected Result**: ✅ Badge count increases immediately via socket

---

### Test Scenario 3: Mark as Read

**Goal**: Verify marking notifications as read works correctly.

**Steps**:
1. Ensure you have at least 2 unread notifications
2. Notification bell shows badge count "2"
3. Click notification bell to open menu
4. Click checkmark icon on first notification
5. Verify:
   - Blue unread dot disappears from that notification
   - Badge count decreases to "1"
6. Click "Mark all read" button
7. Verify:
   - Badge count becomes "0" (or disappears)
   - All blue dots disappear
   - Notifications remain in list (not deleted)

**Expected Result**: ✅ Read status updates correctly

---

### Test Scenario 4: Delete Notification

**Goal**: Verify deleting notifications works correctly.

**Steps**:
1. Open notification bell menu
2. Click trash icon on a notification
3. Verify:
   - Notification disappears from list
   - Badge count decreases (if it was unread)
4. Refresh page
5. Verify notification is still gone

**Expected Result**: ✅ Notification is permanently deleted

---

### Test Scenario 5: Cardmarket Link

**Goal**: Verify clicking Cardmarket link opens correct page.

**Steps**:
1. Open notification bell
2. Click "View on Cardmarket" link on any notification
3. Verify:
   - Opens in new tab
   - URL is `https://www.cardmarket.com/en/Magic/Products/Search?searchString=CARD_NAME&mode=gallery`
   - Search results show the correct card

**Expected Result**: ✅ Cardmarket opens with correct search

---

### Test Scenario 6: No Duplicate Alerts

**Goal**: Verify that duplicate alerts are not created within 24 hours.

**Steps**:
1. Create a price alert (use Test Scenario 1)
2. Trigger price check again:
   ```bash
   tsx server/scripts/test-price-alerts.ts
   ```
3. Check server logs
4. Verify message: "No new alerts created" or similar
5. Check notification bell
6. Verify badge count did NOT increase

**Expected Result**: ✅ No duplicate alert created

---

### Test Scenario 7: Foil Price Checking

**Goal**: Verify that foilOnly wishlist items check foil prices.

**Steps**:
1. Add card to wishlist:
   - Set `maxPrice` to €20.00
   - Check `foilOnly` checkbox
2. Update card's foil price in database:
   ```sql
   UPDATE cards
   SET price_eur_foil = 18.00
   WHERE name LIKE '%Lightning Bolt%'
   LIMIT 1;
   ```
3. Trigger price check
4. Verify alert is created with foil price (€18.00)

**Expected Result**: ✅ Alert uses foil price

---

### Test Scenario 8: No Alert When Price Above Max

**Goal**: Verify that alerts are NOT created when price is above maxPrice.

**Steps**:
1. Add card to wishlist with maxPrice: €10.00
2. Update card price to €15.00 (above maxPrice)
3. Trigger price check
4. Check server logs
5. Verify: "0 alerts created"
6. Check notification bell
7. Verify: No new notification

**Expected Result**: ✅ No alert created

---

### Test Scenario 9: Price Not Available

**Goal**: Verify handling of cards with no price data.

**Steps**:
1. Find a card with NULL priceEur:
   ```sql
   SELECT id, name FROM cards WHERE price_eur IS NULL LIMIT 1;
   ```
2. Add that card to wishlist with maxPrice: €10.00
3. Trigger price check
4. Check server logs
5. Verify: No error, card is skipped
6. Verify: No alert created

**Expected Result**: ✅ Handles missing prices gracefully

---

### Test Scenario 10: Multiple Users

**Goal**: Verify that alerts are user-specific.

**Steps**:
1. Create two test users (User A, User B)
2. User A: Add card with maxPrice: €10.00
3. User B: Add same card with maxPrice: €5.00
4. Update card price to €8.00
5. Trigger price check
6. Verify:
   - User A gets alert (8 < 10)
   - User B does NOT get alert (8 > 5)
7. Login as User A
8. Verify: Badge count = 1
9. Login as User B
10. Verify: Badge count = 0

**Expected Result**: ✅ Alerts are user-specific based on their maxPrice

---

## API Testing with cURL

### Get Notifications
```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Unread Count
```bash
curl -X GET "http://localhost:5000/api/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Mark as Read
```bash
curl -X PATCH "http://localhost:5000/api/notifications/ALERT_ID/read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Mark All as Read
```bash
curl -X PATCH "http://localhost:5000/api/notifications/read-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete Notification
```bash
curl -X DELETE "http://localhost:5000/api/notifications/ALERT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Queries for Testing

### View All Wishlist Items with maxPrice
```sql
SELECT
  w.id,
  u.display_name,
  c.name,
  w.max_price,
  c.price_eur,
  w.foil_only,
  c.price_eur_foil
FROM wishlist_items w
JOIN users u ON w.user_id = u.id
JOIN cards c ON w.card_id = c.id
WHERE w.max_price IS NOT NULL;
```

### View All Price Alerts
```sql
SELECT
  pa.id,
  u.display_name,
  c.name,
  pa.old_price,
  pa.new_price,
  pa.read,
  pa.created_at
FROM price_alerts pa
JOIN users u ON pa.user_id = u.id
JOIN cards c ON pa.card_id = c.id
ORDER BY pa.created_at DESC;
```

### Simulate Price Drop
```sql
-- Find a card on wishlist
SELECT c.id, c.name, c.price_eur, w.max_price
FROM cards c
JOIN wishlist_items w ON c.id = w.card_id
WHERE w.max_price IS NOT NULL
LIMIT 1;

-- Drop its price below maxPrice
UPDATE cards
SET price_eur = 5.00
WHERE id = 'CARD_UUID_FROM_ABOVE';
```

### Clean Up Test Data
```sql
-- Delete all price alerts
DELETE FROM price_alerts;

-- Reset card prices
UPDATE cards SET price_eur = 10.00 WHERE name LIKE '%Lightning Bolt%';
```

---

## Troubleshooting

### No Alerts Created
1. Check wishlist has items with maxPrice set
2. Check card has price data (priceEur or priceEurFoil)
3. Verify price is actually below maxPrice
4. Check for existing alerts within 24 hours
5. Review server logs for errors

### Socket Not Working
1. Check browser DevTools → Network → WS
2. Verify socket connection established
3. Check token is valid
4. Ensure user is authenticated
5. Check CORS settings in server

### Badge Count Not Updating
1. Verify socket connection (see above)
2. Hard refresh page (Cmd+Shift+R)
3. Check React Query cache in DevTools
4. Verify API response includes unreadCount

### Notification Not Appearing
1. Check database for alert existence
2. Verify alert belongs to current user
3. Check API response format
4. Look for React errors in DevTools console

---

## Performance Testing

### Load Test: 1000 Wishlist Items
```bash
# Create 1000 wishlist items with maxPrice
# Run price check
# Measure execution time
time tsx server/scripts/test-price-alerts.ts
```

**Expected**: < 5 seconds for 1000 items

### Concurrent Users
1. Open 5 browser tabs with different users
2. Trigger price checks
3. Verify all users receive their alerts
4. Check for socket room isolation

---

## Checklist

- [ ] Basic price alert creation
- [ ] Real-time socket updates
- [ ] Mark as read (single)
- [ ] Mark all as read
- [ ] Delete notification
- [ ] Cardmarket link opens correctly
- [ ] No duplicate alerts within 24 hours
- [ ] Foil price checking
- [ ] No alert when price above max
- [ ] Missing price handling
- [ ] Multiple users (user-specific alerts)
- [ ] API endpoints work via cURL
- [ ] Performance acceptable (< 5s for 1000 items)
- [ ] Socket connection stable
- [ ] Badge count accurate

---

## Success Criteria

✅ All test scenarios pass
✅ No errors in server logs
✅ No errors in browser console
✅ Socket connection stable
✅ Real-time updates work
✅ API responses correct
✅ UI updates correctly
✅ Performance acceptable

**Status**: Ready for QA Testing
