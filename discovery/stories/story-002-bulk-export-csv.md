# Story: 002 - Export Collection to CSV

**As a** collector
**I want to** export my collection to a CSV file
**So that** I can backup my data or use it in other applications

**Story Points:** 3
**Priority:** Medium
**Epic:** Collection Enhancements

## Acceptance Criteria

### AC1: Export full collection
**Given** I am on the Collection page
**When** I click "Export" and select "Full Collection"
**Then** a CSV file downloads containing all my cards with their details

### AC2: Export filtered results
**Given** I have applied filters (search term, for-trade-only)
**When** I click "Export"
**Then** only the filtered cards are included in the export

### AC3: CSV content
**Given** I export my collection
**When** I open the CSV file
**Then** it contains columns: name, set_code, quantity, foil_quantity, condition, language, for_trade, trade_price, scryfall_id

### AC4: Export trades only
**Given** I want to share my trade list
**When** I select "Export Trades Only"
**Then** only cards with `forTrade > 0` are exported

## Technical Notes
- Generate CSV on the server to handle large collections
- Include a header row with column names
- Use ISO date format for any timestamps
- Filename format: `mtg-collection-{username}-{date}.csv`

## Dependencies
- Collection API endpoint (extend existing)

## Out of Scope
- Excel format export
- PDF export with images
