#!/bin/bash

# Test script for Math API

BASE_URL="http://localhost:8080"

echo "🧪 Testing Math API..."
echo ""

# Test Add
echo "➕ Testing Addition (5 + 3):"
curl -X POST ${BASE_URL}/api/math/add \
  -H "Content-Type: application/json" \
  -d '{"operand1": 5, "operand2": 3}' \
  -s | jq .
echo ""

# Test Subtract
echo "➖ Testing Subtraction (10 - 4):"
curl -X POST ${BASE_URL}/api/math/subtract \
  -H "Content-Type: application/json" \
  -d '{"operand1": 10, "operand2": 4}' \
  -s | jq .
echo ""

# Test Multiply
echo "✖️  Testing Multiplication (6 * 7):"
curl -X POST ${BASE_URL}/api/math/multiply \
  -H "Content-Type: application/json" \
  -d '{"operand1": 6, "operand2": 7}' \
  -s | jq .
echo ""

# Test Divide
echo "➗ Testing Division (20 / 5):"
curl -X POST ${BASE_URL}/api/math/divide \
  -H "Content-Type: application/json" \
  -d '{"operand1": 20, "operand2": 5}' \
  -s | jq .
echo ""

echo "✅ All tests completed!"

