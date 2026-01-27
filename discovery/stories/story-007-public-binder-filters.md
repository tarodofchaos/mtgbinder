# Story: 007 - Public Binder Filtering and Search

**As a** visitor viewing someone's public binder
**I want to** search and filter the displayed cards
**So that** I can quickly find cards I'm interested in trading for

**Story Points:** 3
**Priority:** High
**Epic:** Public Binder Experience

## Acceptance Criteria

### AC1: Search within binder
**Given** I am viewing a public binder at `/binder/:shareCode`
**When** I type in the search box
**Then** only cards matching my search term are displayed

### AC2: Filter by condition
**Given** I am viewing a public binder
**When** I select a minimum condition (e.g., "NM or better")
**Then** only cards meeting that condition are shown

### AC3: Filter by price range
**Given** I am viewing a public binder
**When** I set a max price
**Then** only cards at or below that price are displayed

### AC4: Sort options
**Given** I am viewing a public binder
**When** I change the sort order
**Then** cards are sorted by: name, price (low-high/high-low), recently added

### AC5: Filter persistence
**Given** I apply filters on a public binder
**When** I switch between Grid and Binder view
**Then** my filters remain applied

## Technical Notes
- Extend `GET /api/binder/:shareCode` to accept filter params
- Client-side filtering for small collections (<100 cards)
- Server-side filtering for larger collections
- Add filter UI that doesn't require authentication

## Dependencies
- Public binder endpoint (already exists)
- PublicTradesPage component

## Out of Scope
- Saving favorite cards from public binders (requires auth)
- Comparing multiple binders
