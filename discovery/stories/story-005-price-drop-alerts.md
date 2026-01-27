# Story: 005 - Wishlist Price Drop Alerts

**As a** collector
**I want to** receive notifications when wishlist cards drop below my max price
**So that** I can buy cards at my target price

**Story Points:** 8
**Priority:** High
**Epic:** Wishlist Improvements

## Acceptance Criteria

### AC1: Set price alert
**Given** I am adding/editing a wishlist item
**When** I set a "Max Price" value
**Then** the price alert is configured for that card

### AC2: Price check trigger
**Given** card prices are updated in the system
**When** a wishlist card's price drops to or below my max price
**Then** a notification is created for me

### AC3: In-app notification
**Given** I have a price alert triggered
**When** I open the application
**Then** I see a notification badge and can view the alert

### AC4: View all alerts
**Given** I have triggered price alerts
**When** I click the notification icon
**Then** I see a list of cards that hit their target prices

### AC5: Alert dismissal
**Given** I view a price alert
**When** I click "Dismiss" or "Mark as Read"
**Then** the alert is cleared from my notification list

### AC6: One-time vs recurring
**Given** I set up a price alert
**When** configuring the alert
**Then** I can choose "Alert once" or "Alert every time price drops"

## Technical Notes
- New `Notification` model in Prisma schema
- Background job to check prices daily (price data from Scryfall/Cardmarket)
- Use Socket.IO for real-time in-app notifications
- Consider email notifications as follow-up story

## Dependencies
- Price data updates (existing priceEur field on Card)
- Wishlist with maxPrice field (already exists)

## Out of Scope
- Email notifications (separate story)
- SMS/push notifications
- Price increase alerts
