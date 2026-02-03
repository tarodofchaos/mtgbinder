# Wishlist Import from Decklist

## Overview

Story 010 implements the ability to import a decklist directly into your wishlist. This feature allows deck builders to quickly add all cards needed for a new deck without manually searching and adding each card individually.

## User Flow

1. User clicks "Import Decklist" button on Wishlist page
2. Modal opens with text area for pasting decklist
3. User selects default priority level (Low, Normal, High, Urgent)
4. User clicks "Preview Import"
5. System parses decklist and shows preview with:
   - Card name and matched printing
   - Quantity needed
   - Quantity already owned (from collection)
   - Match status (found, not found, already in wishlist)
6. User reviews preview and clicks "Import X Cards"
7. Cards are added to wishlist
8. Modal closes and wishlist refreshes

## Supported Formats

The parser supports multiple common decklist formats:

- `4 Lightning Bolt` - Standard format
- `4x Card Name` - With "x" prefix
- `Card Name x4` - With "x" suffix
- `4 Lightning Bolt (M10)` - With set code in parentheses

### Special Handling

- **Empty lines**: Ignored
- **Sideboard markers**: Lines containing only "Sideboard:" or "SB:" are ignored
- **Set codes**: If provided, the system prefers that printing; otherwise, the most recent printing is used
- **Card names**: Case-insensitive matching with support for special characters (commas, apostrophes, etc.)

## Technical Implementation

### Backend

#### Parser (`/server/src/utils/decklist-parser.ts`)

- Parses decklist text into structured entries
- Extracts card name, quantity, and optional set code
- Returns errors for unparseable lines

#### Endpoints

1. **POST /api/wishlist/import-decklist**
   - Input: `{ decklistText: string, priority: WishlistPriority }`
   - Returns preview data with:
     - Matched cards from database
     - Owned quantities from user's collection
     - Flags for cards already in wishlist
     - Parse errors

2. **POST /api/wishlist/import-decklist/confirm**
   - Input: `{ cards: [{ cardId: string, quantity: number }], priority: WishlistPriority }`
   - Performs bulk insert of new wishlist items
   - Updates quantities for existing wishlist items
   - Returns import statistics

### Frontend

#### Component (`/client/src/components/wishlist/ImportDecklistModal.tsx`)

Two-step process:

1. **Input Step**
   - Text area for decklist
   - Priority selector
   - Help text showing supported formats

2. **Preview Step**
   - Table showing all parsed cards
   - Status icons (success, error, warning)
   - Owned quantity comparison
   - Filter out already-in-wishlist and not-found cards

#### Service (`/client/src/services/wishlist-service.ts`)

- `importDecklistPreview()` - Preview import
- `confirmDecklistImport()` - Confirm and execute import

## Edge Cases

1. **Card not found**: Shows error icon, excluded from import
2. **Already in wishlist**: Shows warning icon, excluded from import (prevents duplicates)
3. **Set code not found**: Falls back to most recent printing
4. **Unparseable line**: Logged in parseErrors array, shown to user
5. **No valid cards**: Error message shown, import button disabled

## Testing

### Unit Tests

`/server/src/utils/decklist-parser.test.ts` covers:
- All format variations
- Set code handling
- Sideboard marker skipping
- Special characters in card names
- Error handling for unparseable lines

Run tests:
```bash
npm test -- decklist-parser.test.ts
```

### Integration Testing

Manual test flow:
1. Create test user account
2. Add some cards to collection
3. Import a decklist containing:
   - Cards you own
   - Cards you don't own
   - Cards already in wishlist
   - Invalid lines
4. Verify preview shows correct data
5. Confirm import
6. Verify wishlist updated correctly

## Acceptance Criteria Status

- ✅ "Import Decklist" button on Wishlist page opens modal with text area
- ✅ Parse standard formats: "4 Lightning Bolt", "4x Card Name", "Card Name x4"
- ✅ Ignore sideboard markers ("Sideboard:", "SB:")
- ✅ Handle set codes: "4 Lightning Bolt (M10)"
- ✅ Preview shows matched cards, quantities, cards already owned
- ✅ Set default priority for all imported cards
- ✅ Confirm import adds cards to wishlist

## Future Enhancements

1. **Format detection**: Auto-detect MTGO, Arena, or paper formats
2. **Duplicate handling options**: Let user choose to skip or update quantities
3. **Bulk edit**: Allow editing priority/quantity per card in preview
4. **Save/load decklists**: Store decklists for later use
5. **Import from URL**: Support MTGGoldfish, Moxfield, Archidekt links
