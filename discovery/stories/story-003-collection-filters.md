# Story: 003 - Advanced Collection Filters

**As a** collector
**I want to** filter my collection by set, color, rarity, and price range
**So that** I can quickly find specific cards in my collection

**Story Points:** 5
**Priority:** High
**Epic:** Collection Enhancements

## Acceptance Criteria

### AC1: Filter by set
**Given** I am on the Collection page
**When** I select a set from the "Set" dropdown
**Then** only cards from that set are displayed

### AC2: Filter by color identity
**Given** I am viewing my collection
**When** I click color filter buttons (W/U/B/R/G/Colorless)
**Then** only cards matching the selected colors are shown

### AC3: Filter by rarity
**Given** I am viewing my collection
**When** I select rarity (Common, Uncommon, Rare, Mythic)
**Then** only cards of that rarity are displayed

### AC4: Filter by price range
**Given** I am viewing my collection
**When** I set a minimum and/or maximum price
**Then** only cards within that price range are shown

### AC5: Combined filters
**Given** I have multiple filters active
**When** I view the collection
**Then** results match ALL active filter criteria (AND logic)

### AC6: Clear filters
**Given** I have filters applied
**When** I click "Clear Filters"
**Then** all filters reset and full collection is shown

## Technical Notes
- Add filter parameters to existing `GET /api/collection` endpoint
- Use MUI Autocomplete for set selector (searchable)
- Color filters as toggle buttons with MTG mana symbols
- Store filter state in URL params for shareable/bookmarkable views

## Dependencies
- Card model has: setCode, rarity, manaValue, manaCost, priceEur

## Out of Scope
- Saved filter presets (separate story)
- Type line filtering
