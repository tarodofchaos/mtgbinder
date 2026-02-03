# Story: 011 - Import Wishlist from CSV

**As a** collector
**I want to** import my wishlist from a CSV file
**So that** I can quickly populate my wants with priorities and price limits

**Story Points:** 3
**Priority:** Medium
**Epic:** Wishlist Improvements

## Acceptance Criteria

### AC1: Upload CSV file
**Given** I am on the Wishlist page
**When** I click "Import CSV" and select a CSV file
**Then** the system validates the file format and shows a preview of cards to import

### AC2: CSV format validation
**Given** I upload a CSV file
**When** the file contains required columns (name) and optional columns (quantity, priority, maxPrice, minCondition, foilOnly)
**Then** the system validates data types and shows clear error messages for invalid rows

### AC3: Card matching
**Given** I upload a valid CSV with card names
**When** the system processes the file
**Then** it matches cards by name to existing card data (using Scryfall IDs)

### AC4: Import preview
**Given** the CSV is validated
**When** I review the preview
**Then** I see matched cards with their import settings (priority, price limits, conditions)

### AC5: Duplicate handling
**Given** a card in the CSV already exists in my wishlist
**When** I import
**Then** the system asks if I want to update existing entry or skip duplicates

### AC6: Bulk import confirmation
**Given** the preview shows matched cards
**When** I click "Confirm Import"
**Then** all valid cards are added to my wishlist with specified settings

## CSV Format

```csv
name,quantity,priority,maxPrice,minCondition,foilOnly
Lightning Bolt,4,HIGH,2.00,NM,false
Force of Will,1,URGENT,80.00,LP,false
Brainstorm,4,NORMAL,,NM,false
```

**Required columns:**
- `name` - Card name (string)

**Optional columns:**
- `quantity` - Number needed (integer, default: 1)
- `priority` - LOW, NORMAL, HIGH, URGENT (default: NORMAL)
- `maxPrice` - Maximum price willing to pay (decimal, default: null)
- `minCondition` - M, NM, LP, MP, HP, DMG (default: LP)
- `foilOnly` - true/false (default: false)

## Technical Notes
- Reuse CSV parsing logic from Story 001 (Collection Import)
- Support same validation and card matching infrastructure
- Client-side validation for small files (<100 cards)
- Show "already in collection" badge for cards user owns
- Allow setting default values for missing optional columns

## Dependencies
- Card search service (`/api/cards/search`)
- Wishlist service (`wishlist.ts`)
- Story 001 CSV parsing utilities

## Out of Scope
- Decklist format (covered by Story 010)
- Price data fetching (manual entry only)
- Set-specific imports (uses default printing)
