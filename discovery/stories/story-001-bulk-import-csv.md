# Story: 001 - Bulk Import Collection from CSV

**As a** collector
**I want to** import my card collection from a CSV file
**So that** I can quickly populate my collection without manually adding each card

**Story Points:** 5
**Priority:** High
**Epic:** Collection Enhancements

## Acceptance Criteria

### AC1: Upload CSV file
**Given** I am on the Collection page
**When** I click "Import" and select a CSV file
**Then** the system validates the file format and shows a preview of cards to import

### AC2: CSV format validation
**Given** I upload a CSV file
**When** the file contains invalid columns or malformed data
**Then** I see clear error messages indicating which rows have issues

### AC3: Card matching
**Given** I upload a valid CSV with card names
**When** the system processes the file
**Then** it matches cards by name to existing card data (using Scryfall IDs)

### AC4: Import confirmation
**Given** the preview shows matched cards
**When** I click "Confirm Import"
**Then** all valid cards are added to my collection with specified quantities and conditions

### AC5: Duplicate handling
**Given** a card in the CSV already exists in my collection
**When** I import
**Then** the system asks if I want to add to existing quantity or skip duplicates

## Technical Notes
- Support standard CSV format: `name,quantity,condition,foil,for_trade`
- Use streaming for large files to avoid memory issues
- Implement background job for imports >100 cards
- Match cards using the existing card search service

## Dependencies
- Existing card search API (`/api/cards/search`)
- Collection service (`collection.ts`)

## Out of Scope
- MTG Arena/MTGO format imports (separate story)
- Automatic set/edition detection (uses default printing)
