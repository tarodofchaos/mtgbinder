# Story: 006 - Trade Session History

**As a** trader
**I want to** view my past trade sessions and their outcomes
**So that** I can track who I've traded with and what was exchanged

**Story Points:** 3
**Priority:** Medium
**Epic:** Trade Session Enhancements

## Acceptance Criteria

### AC1: Trade history list
**Given** I navigate to the Trade page
**When** I click "Trade History"
**Then** I see a list of my completed trade sessions

### AC2: History entry details
**Given** I view the trade history
**When** I look at an entry
**Then** I see: trading partner name, date, number of matches found

### AC3: Session detail view
**Given** I click on a history entry
**When** the detail view opens
**Then** I see all the matches that were found in that session

### AC4: Filter by date
**Given** I am viewing trade history
**When** I filter by date range
**Then** only sessions within that range are shown

### AC5: Sort options
**Given** I am viewing trade history
**When** I change the sort order
**Then** sessions are sorted by date (newest/oldest first)

## Technical Notes
- Trade sessions already have `COMPLETED` status - query these
- Store `matchesJson` already captures match data
- Add pagination for users with many sessions
- New endpoint: `GET /api/trade/sessions/history`

## Dependencies
- Existing TradeSession model with matchesJson field

## Out of Scope
- Trade ratings/feedback
- Trade completion confirmation (actual exchange tracking)
