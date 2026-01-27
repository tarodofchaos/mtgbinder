# Story: 010 - Import Wishlist from Decklist

**As a** deck builder
**I want to** import a decklist to my wishlist
**So that** I can quickly add all cards I need for a new deck

**Story Points:** 5
**Priority:** Medium
**Epic:** Wishlist Improvements

## Acceptance Criteria

### AC1: Decklist paste input
**Given** I am on the Wishlist page
**When** I click "Import Decklist"
**Then** I see a text area to paste a decklist

### AC2: Standard format parsing
**Given** I paste a decklist in standard format (e.g., "4 Lightning Bolt")
**When** I click "Parse"
**Then** the system extracts card names and quantities

### AC3: Card matching
**Given** the decklist is parsed
**When** processing the import
**Then** each card name is matched to cards in the database

### AC4: Exclude owned cards
**Given** I import a decklist
**When** reviewing cards to add
**Then** I see which cards I already own and can exclude them

### AC5: Set priority
**Given** I'm importing a decklist
**When** confirming the import
**Then** I can set a default priority for all imported cards

### AC6: Preview before import
**Given** I paste a decklist
**When** parsing completes
**Then** I see a preview showing matched cards, quantities, and any unmatched entries

## Technical Notes
- Support formats: "4 Card Name", "4x Card Name", "Card Name x4"
- Ignore sideboard markers ("Sideboard:", "SB:")
- Handle set codes: "4 Lightning Bolt (M10)"
- Compare against collection to show "need X more"

## Dependencies
- Card search service
- Collection API (to check owned cards)
- Wishlist API

## Out of Scope
- MTGA/MTGO specific formats
- Automatic set selection (uses default printing)
