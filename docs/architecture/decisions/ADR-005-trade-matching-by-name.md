# ADR-005: Trade Matching by Card Name Only

## Status

**Accepted**

## Context

When implementing the trade matching feature, we needed to decide how to match cards between users' trade offers and wishlists. Magic: The Gathering cards can have multiple printings across different sets, each with potentially different prices, artwork, and collectibility.

The key question was: Should we match trades by exact card printing (set + collector number) or by card name only?

**User Story**: As a trader, I want to find people who have cards I'm looking for, regardless of which specific printing they have, so I can negotiate the exact version during the trade.

## Decision

Trade matching is performed by **card name only**, not by specific printing (set/collector number).

When comparing User A's trade offers against User B's wishlist:
1. Extract unique card names from both collections
2. Find intersection of names (cards User A has that User B wants)
3. Return all matching items with their respective conditions, quantities, and prices

## Rationale

1. **Flexibility for Traders**: Most players looking for a card will accept multiple printings. Forcing exact print matching would miss many valid trade opportunities.

2. **Wishlist Simplicity**: Users can add "Lightning Bolt" to their wishlist once rather than adding every printing. The wishlist captures intent (wanting the card) rather than specificity (wanting a particular printing).

3. **Discovery Over Precision**: The primary goal of trade matching is discovery—finding potential trading partners. Exact version negotiation happens during the trade conversation, not the matching phase.

4. **Real-World Trading Behavior**: This mirrors how paper MTG trading works. Traders typically ask "Do you have Lightning Bolt?" not "Do you have Lightning Bolt from Revised Edition?"

5. **Price Guidance**: The matching results include price information from both the collection (custom trade price) and the card's market value, allowing traders to understand the value proposition.

## Consequences

### Positive
- Higher match rate between traders
- Simpler wishlist management for users
- Matches real-world trading expectations
- More potential trading partners discovered

### Negative
- Users seeking specific prints (e.g., original Alpha printing) may get irrelevant matches
- Price comparisons between matches can be misleading if prints vary widely in value
- No way to express "I only want foils" or "I only want old border" preferences in matching (though `foilOnly` exists on wishlist items)

### Mitigations
- The card detail popup shows the specific set/printing, so users can evaluate matches
- Wishlist items have a `maxPrice` field to filter out expensive printings
- Wishlist items have a `minCondition` field to ensure quality requirements
- Future enhancement: Add a "specific print" flag for collectors who need exact matches

## Implementation

The matching logic is in `server/src/services/match-service.ts`:

```typescript
// Extract unique card names from collections
const userACardNames = new Set(
  userATradeItems
    .filter((item) => item.card)
    .map((item) => item.card!.name.toLowerCase())
);

// Find matches by name
const userAOffersToB = userATradeItems.filter((item) =>
  userBWishlistNames.has(item.card!.name.toLowerCase())
);
```

## References

- Related to: ADR-003 (Socket.IO for Real-Time Trading)
- Trade matching service: `server/src/services/match-service.ts`
- Wishlist model includes `maxPrice`, `minCondition`, `foilOnly` for filtering
