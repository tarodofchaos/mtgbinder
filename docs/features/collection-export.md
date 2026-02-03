# Collection Export Feature

## Overview

The Collection Export feature allows users to download their card collection as a CSV file. This enables users to:
- Back up their collection data locally
- Import data into spreadsheet tools (Excel, Google Sheets)
- Share collection data with third-party tools
- Perform offline analysis

## User Interface

### Export Button Location
The "Export CSV" button is located on the Collection page in the top action bar, between the "For Trade Only" checkbox and the "Import CSV" button.

### Button States
- **Enabled**: When the collection has items to export (respects active filters)
- **Disabled**: When the collection is empty or no items match the current filters
- **Loading**: Shows "Exporting..." text while the download is being prepared

### Filter Support
The export function respects all active filters:
- Search term (card name)
- Set code
- Colors
- Rarity
- Price range (min/max)
- For Trade Only flag

**Example**: If you filter for "Red cards over €10 marked for trade", only those cards will be exported.

## CSV Format

### File Naming
Files are automatically named with the current date:
```
mtg-collection-YYYY-MM-DD.csv
```
Example: `mtg-collection-2026-02-03.csv`

### CSV Structure
The exported CSV includes the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `name` | Card name | Lightning Bolt |
| `set_code` | Set code (uppercase) | M21 |
| `quantity` | Non-foil quantity | 4 |
| `foil_quantity` | Foil quantity | 1 |
| `condition` | Card condition | NM |
| `language` | Language code | EN |
| `for_trade` | Quantity available for trade | 2 |
| `trade_price` | User's asking price (€) | 0.50 |
| `scryfall_id` | Scryfall UUID | abc123... |

### CSV Example
```csv
name,set_code,quantity,foil_quantity,condition,language,for_trade,trade_price,scryfall_id
Lightning Bolt,M21,4,0,NM,EN,2,0.50,abc123-def456-789
"Urza, Lord High Artificer",MH1,1,1,NM,EN,0,,xyz789-uvw456-123
Sol Ring,CMR,3,0,LP,EN,1,1.20,def456-ghi789-012
```

### Special Character Handling
- **Commas**: Card names with commas are wrapped in quotes
  - Example: `"Urza, Lord High Artificer"`
- **Quotes**: Existing quotes in card names are escaped with double quotes
  - Example: `"Card with ""quotes"""`
- **Empty values**: Null fields (like `trade_price` or `scryfall_id`) are exported as empty strings

## API Endpoint

### Request
```
GET /api/collection/export
```

### Query Parameters
All filter parameters from the collection list endpoint are supported:
- `search` (string): Card name search term
- `setCode` (string): Set code filter
- `colors` (string): Comma-separated color codes (W,U,B,R,G)
- `rarity` (string): Rarity filter (common, uncommon, rare, mythic)
- `priceMin` (number): Minimum price in EUR
- `priceMax` (number): Maximum price in EUR
- `forTrade` (boolean): Only items marked for trade

### Response
- **Content-Type**: `text/csv`
- **Content-Disposition**: `attachment; filename="mtg-collection-YYYY-MM-DD.csv"`
- **Body**: CSV data

### Example
```bash
GET /api/collection/export?colors=R&forTrade=true&priceMin=1
```

## Implementation Details

### Backend
- **Route**: `/server/src/routes/collection.ts` - `GET /export` endpoint
- **Validation**: Uses existing `listQuerySchema` for query parameter validation
- **Sorting**: Exports are sorted by card name (ascending)
- **Pagination**: Export fetches all matching items (no pagination)
- **CSV Escaping**: Proper RFC 4180 CSV escaping for special characters

### Frontend
- **Service**: `/client/src/services/collection-service.ts` - `exportCollection()` function
- **Component**: `/client/src/pages/CollectionPage.tsx` - Export button and handler
- **Download**: Uses Blob API and programmatic `<a>` click to trigger browser download
- **File Handling**: Extracts filename from `Content-Disposition` header

## Testing

### Backend Tests
Location: `/server/src/routes/collection.integration.test.ts`

Test coverage includes:
- ✅ Basic CSV export with all fields
- ✅ CSV escaping for commas in card names
- ✅ CSV escaping for quotes in card names
- ✅ Filtered exports (respecting query parameters)
- ✅ Empty export (no matching items)
- ✅ Null value handling (trade_price, scryfall_id)
- ✅ Filename generation with date
- ✅ Sorting by card name
- ✅ No pagination in export results

### Frontend Tests
Location: `/client/src/services/collection-service.test.ts`

Test coverage includes:
- ✅ API call with correct parameters
- ✅ Download link creation and triggering
- ✅ Filename extraction from header
- ✅ Default filename fallback
- ✅ Blob creation with correct MIME type
- ✅ Parameter handling (undefined vs empty)
- ✅ Error handling

## Usage Example

### Exporting Full Collection
1. Navigate to Collection page
2. Click "Export CSV" button
3. Browser downloads `mtg-collection-YYYY-MM-DD.csv`

### Exporting Filtered Results
1. Apply filters (e.g., search for "Lightning", filter by Red color)
2. Click "Export CSV" button
3. Only filtered cards are exported

### Importing into Excel
1. Export CSV from MTG Binder
2. Open Excel
3. File > Import > CSV
4. Select the downloaded file
5. Data is imported with all fields preserved

## Future Enhancements

Potential improvements for consideration:
- Export format selection (CSV, JSON, TXT)
- Include card metadata (type, mana cost, oracle text)
- Export wishlist alongside collection
- Scheduled/automated exports
- Cloud backup integration
