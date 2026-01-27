# Story: 004 - Set Completion Tracker

**As a** collector
**I want to** see my completion percentage for each MTG set
**So that** I can track my progress toward completing sets

**Story Points:** 5
**Priority:** Medium
**Epic:** Collection Enhancements

## Acceptance Criteria

### AC1: Set completion overview
**Given** I navigate to a "Set Completion" view
**When** the page loads
**Then** I see a list of sets I have cards from with completion percentages

### AC2: Completion calculation
**Given** a set has 300 unique cards
**When** I own 150 unique cards from that set
**Then** the completion shows 50%

### AC3: Set detail view
**Given** I click on a set
**When** the detail view opens
**Then** I see cards I have (with checkmarks) and cards I'm missing

### AC4: Missing cards list
**Given** I am viewing a set's details
**When** I click "Show Missing"
**Then** only cards I don't own are displayed

### AC5: Add missing to wishlist
**Given** I'm viewing missing cards from a set
**When** I select cards and click "Add to Wishlist"
**Then** selected cards are added to my wishlist

## Technical Notes
- New endpoint: `GET /api/collection/sets/completion`
- Cache completion calculations (expensive query)
- Use card database to know total cards per set
- Consider only base cards (not variants) for completion %

## Dependencies
- Full card database with set information
- Wishlist API

## Out of Scope
- Foil completion tracking
- Variant/special edition tracking
