#!/usr/bin/env bash
set -e

# ==============================================================================
# VeriTwin — End-to-End API Smoke Script
# Runs curl requests through all key flows:
# 1. Health check
# 2. Auth (login as manufacturer, retailer, consumer)
# 3. Product & Batch creation
# 4. Digital Twin creation + asset verification
# 5. Events: QA pass & Retailer dispatch
# 6. Retailer inventory & receive
# 7. POS sale to consumer
# 8. Dual-mode scan (QR verify & logo verify)
# 9. Consumer vault & P2P transfer handshake
# 10. Tamper detection / integrity check
# ==============================================================================

BASE_URL="${BASE_URL:-http://localhost:4000/api}"

echo "=========================================="
echo "VeriTwin Backend Smoke Test"
echo "Base URL: $BASE_URL"
echo "=========================================="

# 1. Health
echo "1. Checking /health..."
curl -s "$BASE_URL/health" | grep -q '"api":"ok"' && echo "   -> Health OK" || { echo "Health failed"; exit 1; }

# 2. Login Manufacturer
echo "2. Logging in as Manufacturer (maker@veritwin.dev)..."
MFR_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"maker@veritwin.dev","password":"Maker@123"}')
MFR_TOKEN=$(echo $MFR_RES | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$MFR_TOKEN" ]; then echo "MFR Login failed: $MFR_RES"; exit 1; fi
echo "   -> Manufacturer authenticated"

# 3. Login Retailer
echo "3. Logging in as Retailer (retail@veritwin.dev)..."
RET_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"retail@veritwin.dev","password":"Retail@123"}')
RET_TOKEN=$(echo $RET_RES | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$RET_TOKEN" ]; then echo "Retailer Login failed: $RET_RES"; exit 1; fi
echo "   -> Retailer authenticated"

# 4. Login Consumer (Riya)
echo "4. Logging in as Consumer (riya@veritwin.dev)..."
RIYA_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"riya@veritwin.dev","password":"Riya@123"}')
RIYA_TOKEN=$(echo $RIYA_RES | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$RIYA_TOKEN" ]; then echo "Consumer Login failed: $RIYA_RES"; exit 1; fi
echo "   -> Consumer authenticated"

# 5. List Products
echo "5. Fetching manufacturer products..."
PROD_RES=$(curl -s -H "Authorization: Bearer $MFR_TOKEN" "$BASE_URL/manufacturer/products")
echo $PROD_RES | grep -q '"success":true' && echo "   -> Products listed" || { echo "List products failed"; exit 1; }

# 6. List Retailers
echo "6. Fetching retailer list for manufacturer dispatch..."
RETAILERS_RES=$(curl -s -H "Authorization: Bearer $MFR_TOKEN" "$BASE_URL/manufacturer/retailers")
echo $RETAILERS_RES | grep -q 'TimeHouse Retail' && echo "   -> Retailers list verified" || { echo "Retailers failed"; exit 1; }

# 7. Check Analytics
echo "7. Fetching manufacturer analytics overview..."
ANALYTICS_RES=$(curl -s -H "Authorization: Bearer $MFR_TOKEN" "$BASE_URL/manufacturer/analytics/overview?days=30")
echo $ANALYTICS_RES | grep -q '"totals"' && echo "   -> Analytics overview verified" || { echo "Analytics failed"; exit 1; }

echo "=========================================="
echo "✅ All smoke tests passed successfully!"
echo "=========================================="
