# Story MTG-011: Import Wishlist from CSV - Implementation Summary

## Overview
Implemented CSV import functionality for the wishlist feature, allowing users to quickly populate their wishlist with card priorities, price limits, and condition requirements.

## Files Created

### Backend
- **`/server/src/services/import-service.ts`** (updated)
  - Added `importWishlistItems()` function
  - Added `parsePriority()` helper function
  - Handles duplicate detection (skip/update modes)
  - Validates and normalizes wishlist-specific fields

### Frontend Components
- **`/client/src/components/wishlist/ImportWishlistModal.tsx`**
  - Main modal orchestrating the 4-step import workflow
  - Manages state for upload, preview, progress, and results
  - Reuses `ImportProgressStep` and `ImportResultsStep` from collection import

- **`/client/src/components/wishlist/ImportWishlistUploadStep.tsx`**
  - Drag-and-drop CSV file upload
  - Template download button
  - CSV format documentation display
  - Parse error display

- **`/client/src/components/wishlist/ImportWishlistPreviewStep.tsx`**
  - Preview table showing resolved cards with priorities, prices, conditions
  - Displays which cards are already in user's collection
  - Duplicate handling mode selector (skip/update)
  - Manual printing selection for not-found cards
  - Statistics chips (Total, Ready, Not Found)

### Frontend Services
- **`/client/src/services/import-service.ts`** (updated)
  - `parseWishlistCSV()` - Parses wishlist CSV with validation
  - `prepareWishlistImportPreview()` - Resolves cards and checks collection ownership
  - `wishlistPreviewRowsToImportRows()` - Converts preview to import format
  - `importWishlistBatch()` - Single batch import
  - `importWishlistBatched()` - Batch processing with progress callbacks
  - `downloadWishlistCSVTemplate()` - Downloads sample template

### Routes
- **`/server/src/routes/import.ts`** (updated)
  - Added `POST /api/import/wishlist` endpoint
  - Validates CSV rows with Zod schema
  - Supports skip/update duplicate modes

### Pages
- **`/client/src/pages/WishlistPage.tsx`** (updated)
  - Added "Import CSV" button in filters row
  - Added `showCSVImportModal` state
  - Added `ImportWishlistModal` component at the end

## CSV Format

### Required Columns
- **name** - Card name (required)

### Optional Columns
- **quantity** - Number of copies wanted (default: 1)
- **priority** - LOW, NORMAL, HIGH, URGENT (default: NORMAL)
- **maxPrice** - Maximum price in EUR (optional)
- **minCondition** - M, NM, LP, MP, HP, DMG (optional)
- **foilOnly** - true/false (default: false)

### Example CSV
```csv
name,quantity,priority,maxPrice,minCondition,foilOnly
Lightning Bolt,4,HIGH,2.00,NM,false
Force of Will,1,URGENT,80.00,LP,false
Mana Crypt,1,HIGH,150.00,NM,true
Sol Ring,2,NORMAL,1.50,LP,false
Black Lotus,1,URGENT,,M,false
```

## Features Implemented

### 1. CSV Upload with Validation
- Drag-and-drop file upload
- File size limit: 5MB
- Maximum 1000 rows
- Validates required fields (name)
- Validates optional fields (priority, condition, etc.)
- Displays parse errors with row numbers

### 2. Card Name Resolution
- Resolves card names to their most recent printing
- Displays card images, set information, and prices
- Shows "Not Found" status for unrecognized cards
- Allows manual printing selection via PrintingSelector

### 3. Collection Ownership Check
- Checks if cards are already in user's collection
- Displays "In Collection" badge on preview
- Helps users identify duplicate entries

### 4. Duplicate Handling
Two modes for existing wishlist items:
- **Skip** - Keep existing wishlist entry unchanged
- **Update** - Replace with new values from CSV

### 5. Progress Tracking
- Batch processing for large imports (>100 cards)
- Real-time progress bar
- Percentage and batch count display

### 6. Results Summary
- Shows imported, updated, skipped, and failed counts
- Lists errors with row numbers and card names
- Success confirmation

### 7. Template Download
- Provides sample CSV template
- Includes example data
- Documents all available fields

## Technical Implementation Details

### Backend
- Uses Prisma transaction for atomicity
- Validates priority enum values (LOW, NORMAL, HIGH, URGENT)
- Validates condition enum values (M, NM, LP, MP, HP, DMG)
- Normalizes boolean values (true/false, 1/0, yes/no)
- Unique constraint on `userId_cardId` prevents duplicates
- Logs import results with Winston

### Frontend
- Uses PapaParse for CSV parsing
- TanStack Query for API calls and cache invalidation
- MUI components for UI
- Stepper component for workflow visualization
- Reuses PrintingSelector for manual card selection
- Reuses ImportProgressStep and ImportResultsStep from collection import

### API Endpoints
- **POST /api/import/wishlist**
  - Request: `{ rows: ImportRow[], duplicateMode: 'skip' | 'update' }`
  - Response: `{ data: ImportResult }`
  - Requires authentication

## Acceptance Criteria Status

1. ✅ "Import CSV" button on Wishlist page opens file picker
2. ✅ CSV format: name (required), quantity, priority, maxPrice, minCondition, foilOnly
3. ✅ Validate file format and show preview before import
4. ✅ Match cards by name to database
5. ✅ Handle duplicates (update existing or skip)
6. ✅ Show which cards are already in collection

## Testing

### Manual Testing Steps
1. Navigate to Wishlist page
2. Click "Import CSV" button
3. Upload test CSV file (`test-wishlist-import.csv`)
4. Verify preview shows:
   - Card images and details
   - Priority chips (color-coded)
   - Max price values
   - Min condition values
   - "In Collection" badges for owned cards
5. Select duplicate handling mode (skip/update)
6. Click "Import" button
7. Verify progress bar displays
8. Verify results summary shows correct counts
9. Verify wishlist page refreshes with new items

### Test CSV Files
- `/test-wishlist-import.csv` - Sample import file with 5 cards

## Known Limitations
- Maximum 1000 cards per import
- Maximum 5MB file size
- Only CSV format supported (not Excel, JSON, etc.)
- Card names must exactly match database entries
- No fuzzy matching for misspelled card names
- Collection ownership check loads all collection items (may be slow for large collections)

## Future Enhancements
- Support for multiple printings per card name
- Fuzzy card name matching
- Import from other formats (JSON, Excel, MTG-specific formats)
- Bulk edit mode for imported items
- Import history and rollback
- Duplicate detection across different printings
- Price validation against Scryfall/Cardmarket APIs
- Collection ownership check optimization (load only relevant cards)

## Dependencies
- papaparse - CSV parsing library (already in project)
- @mui/material - UI components (already in project)
- @tanstack/react-query - State management (already in project)
- Prisma - Database ORM (already in project)

## Database Schema
No schema changes required. Uses existing `WishlistItem` model:
- `userId` - User ID (relation)
- `cardId` - Card ID (relation)
- `quantity` - Number of copies wanted
- `priority` - WishlistPriority enum
- `maxPrice` - Maximum price (nullable)
- `minCondition` - CardCondition enum (nullable)
- `foilOnly` - Boolean flag
- Unique constraint: `@@unique([userId, cardId])`

## Commit Message
```
feat(wishlist): implement CSV import functionality

- Add POST /api/import/wishlist endpoint with skip/update duplicate modes
- Create ImportWishlistModal with 4-step workflow (upload, preview, progress, results)
- Add wishlist CSV parsing with validation for priority, maxPrice, minCondition, foilOnly
- Check collection ownership and display badges on preview
- Support manual printing selection for not-found cards
- Add "Import CSV" button to WishlistPage
- Include sample CSV template download
- Batch processing for large imports with progress tracking

Resolves: MTG-011
```
