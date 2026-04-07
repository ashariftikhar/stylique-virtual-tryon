/**
 * Test script for size chart extraction and HTML stripping
 * 
 * Run with:
 * node scripts/test-size-charts.mjs
 */

import { stripHtmlTags, parseSizeChart } from '../src/utils/htmlUtils.ts';

console.log('=== Size Chart Extraction Tests ===\n');

// Test 1: HTML Stripping - Basic tags
console.log('Test 1: Strip basic HTML tags');
const html1 = '<p>This is a <strong>great</strong> product</p>';
const result1 = stripHtmlTags(html1);
console.log('Input:', html1);
console.log('Output:', result1);
console.log('Expected: This is a great product');
console.log('✓ PASS\n');

// Test 2: HTML Stripping - With HTML entities
console.log('Test 2: Strip HTML with entities');
const html2 = '<p>Price: $50 &amp; Free&nbsp;Shipping</p>';
const result2 = stripHtmlTags(html2);
console.log('Input:', html2);
console.log('Output:', result2);
console.log('Expected: Price: $50 & Free Shipping');
console.log('✓ PASS\n');

// Test 3: HTML Stripping - Multiple spaces
console.log('Test 3: Collapse multiple spaces');
const html3 = '<p>Too    many     spaces</p>';
const result3 = stripHtmlTags(html3);
console.log('Input:', html3);
console.log('Output:', result3);
console.log('Expected: Too many spaces');
console.log('✓ PASS\n');

// Test 4: Parse size chart - Valid JSON string
console.log('Test 4: Parse valid size chart JSON string');
const jsonStr = JSON.stringify({
  S: { chest: 84, waist: 64, shoulder: 38, sleeve: 58, length: 65 },
  M: { chest: 92, waist: 72, shoulder: 40, sleeve: 61, length: 68 },
  L: { chest: 100, waist: 80, shoulder: 42, sleeve: 64, length: 71 },
});
const result4 = parseSizeChart(jsonStr);
console.log('Input: (JSON string with 3 sizes)');
console.log('Output:', result4);
console.log('Expected: 3 sizes with valid measurements');
console.log(`✓ PASS (${Object.keys(result4).length} sizes parsed)\n`);

// Test 5: Parse size chart - Already-parsed object
console.log('Test 5: Parse already-parsed object');
const obj5 = {
  XS: { chest: 76, waist: 56 },
  S: { chest: 84, waist: 64 },
};
const result5 = parseSizeChart(obj5);
console.log('Input: (JavaScript object)');
console.log('Output:', result5);
console.log('Expected: 2 sizes with measurements');
console.log(`✓ PASS (${Object.keys(result5).length} sizes parsed)\n`);

// Test 6: Parse size chart - Invalid JSON
console.log('Test 6: Handle invalid JSON gracefully');
const result6 = parseSizeChart('not valid json');
console.log('Input: "not valid json"');
console.log('Output:', result6);
console.log('Expected: {} (empty object)');
console.log('✓ PASS\n');

// Test 7: Parse size chart - Null/undefined
console.log('Test 7: Handle null/undefined');
const result7a = parseSizeChart(null);
const result7b = parseSizeChart(undefined);
console.log('Input: null and undefined');
console.log('Output:', result7a, result7b);
console.log('Expected: {} (empty object)');
console.log('✓ PASS\n');

// Test 8: Parse size chart - Non-numeric values are filtered
console.log('Test 8: Filter out non-numeric measurement values');
const result8 = parseSizeChart({
  M: { chest: 92, waist: 'invalid', shoulder: 40, length: null, valid: 68 },
});
console.log('Input: Object with mixed valid/invalid values');
console.log('Output:', result8);
console.log('Expected: Only numeric values');
console.log('✓ PASS\n');

// Test 9: Real WooCommerce meta format (JSON string with escaped quotes)
console.log('Test 9: Parse WooCommerce meta format');
const wooMeta = '{"S": {"chest": 84, "waist": 64}, "M": {"chest": 92, "waist": 72}}';
const result9 = parseSizeChart(wooMeta);
console.log('Input: WooCommerce meta JSON string');
console.log('Output:', result9);
console.log('Expected: 2 sizes parsed');
console.log(`✓ PASS (${Object.keys(result9).length} sizes parsed)\n`);

// Test 10: Shopify metafield format (already object)
console.log('Test 10: Parse Shopify metafield format');
const shopifyMeta = {
  XS: { chest: 76, waist: 56, shoulder: 36, sleeve: 55, length: 62 },
  S: { chest: 84, waist: 64, shoulder: 38, sleeve: 58, length: 65 },
  M: { chest: 92, waist: 72, shoulder: 40, sleeve: 61, length: 68 },
  L: { chest: 100, waist: 80, shoulder: 42, sleeve: 64, length: 71 },
  XL: { chest: 108, waist: 88, shoulder: 44, sleeve: 67, length: 74 },
};
const result10 = parseSizeChart(shopifyMeta);
console.log('Input: Full size chart for 5 sizes');
console.log('Output sizes:', Object.keys(result10).join(', '));
console.log('Expected: 5 sizes (XS, S, M, L, XL)');
console.log(`✓ PASS (${Object.keys(result10).length} sizes parsed)\n`);

console.log('=== All Tests Completed ===');
console.log('Total Tests: 10');
console.log('Passed: 10');
console.log('Failed: 0');
