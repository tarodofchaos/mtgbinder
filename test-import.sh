#!/bin/bash

# Test decklist import endpoint (requires authentication)
# This script is for manual testing only

DECKLIST='4 Lightning Bolt
3x Counterspell
Brainstorm x2
4 Ponder (M12)'

# First login to get token (replace with valid credentials)
# TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{"email":"test@example.com","password":"password"}' \
#   | jq -r '.token')

# Then test import
# curl -X POST http://localhost:5000/api/wishlist/import-decklist \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer $TOKEN" \
#   -d "{\"decklistText\":\"$DECKLIST\",\"priority\":\"NORMAL\"}"

echo "Test script created. Update with valid credentials to test."
echo "Decklist to test:"
echo "$DECKLIST"
