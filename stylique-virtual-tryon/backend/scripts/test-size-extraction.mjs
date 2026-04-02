#!/usr/bin/env node
/**
 * Test script to verify size extraction from Shopify product variants.
 * Tests the updated sizesFromVariants function with various product structures.
 *
 * Usage:
 *   node scripts/test-size-extraction.mjs
 */

/**
 * Extract sizes from all variant options (option1, option2, option3).
 * Returns unique, non-null, non-empty size values.
 */
function sizesFromVariants(product) {
  if (!product.variants || product.variants.length === 0) {
    return [];
  }

  // Collect all option values from all variants
  const allOptionValues = new Set();

  for (const variant of product.variants) {
    // Extract option1, option2, option3
    const options = [variant.option1, variant.option2, variant.option3].filter(
      (opt) => opt != null && String(opt).trim() !== ''
    );

    for (const opt of options) {
      allOptionValues.add(String(opt).trim());
    }
  }

  // Convert Set to Array and return sorted
  return Array.from(allOptionValues).sort();
}

// Test Case 1: Product with size in option1 (S, M, L)
const testProduct1 = {
  id: 1,
  title: 'Test T-Shirt with Size',
  handle: 'test-tshirt',
  variants: [
    { price: '19.99', option1: 'S', option2: null, option3: null },
    { price: '19.99', option1: 'M', option2: null, option3: null },
    { price: '19.99', option1: 'L', option2: null, option3: null },
  ],
};

// Test Case 2: Product with size in option2 (common when option1 is color)
const testProduct2 = {
  id: 2,
  title: 'T-Shirt with Color and Size',
  handle: 'tshirt-color-size',
  variants: [
    { price: '19.99', option1: 'Red', option2: 'S', option3: null },
    { price: '19.99', option1: 'Red', option2: 'M', option3: null },
    { price: '19.99', option1: 'Blue', option2: 'L', option3: null },
  ],
};

// Test Case 3: Product with size in option3 (Color + Material + Size)
const testProduct3 = {
  id: 3,
  title: 'Premium Shirt',
  handle: 'premium-shirt',
  variants: [
    { price: '29.99', option1: 'Red', option2: 'Cotton', option3: 'S' },
    { price: '29.99', option1: 'Red', option2: 'Cotton', option3: 'M' },
    { price: '29.99', option1: 'Blue', option2: 'Poly', option3: 'L' },
  ],
};

// Test Case 4: Product with sizes across different options
const testProduct4 = {
  id: 4,
  title: 'Multi-variant Product',
  handle: 'multi-variant',
  variants: [
    { price: '19.99', option1: 'S', option2: 'Red', option3: null },
    { price: '19.99', option1: 'M', option2: 'Blue', option3: null },
    { price: '19.99', option1: 'L', option2: 'Green', option3: 'Cotton' },
    { price: '19.99', option1: 'XL', option2: 'Black', option3: 'Poly' },
  ],
};

// Test Case 5: Product with empty/null values (should be filtered)
const testProduct5 = {
  id: 5,
  title: 'Product with Empty Options',
  handle: 'empty-options',
  variants: [
    { price: '19.99', option1: 'S', option2: '', option3: null },
    { price: '19.99', option1: 'M', option2: '  ', option3: null },
    { price: '19.99', option1: 'L', option2: null, option3: null },
  ],
};

// Test Case 6: Product with no variants (still supported)
const testProduct6 = {
  id: 6,
  title: 'Product No Variants',
  handle: 'no-variants',
  variants: [],
};

// Run tests
console.log('🧪 Testing Size Extraction from Shopify Product Variants\n');

const testCases = [
  { name: 'Size in option1 (S, M, L)', product: testProduct1, expected: ['L', 'M', 'S'] },
  { name: 'Color + Size (option1=color, option2=size)', product: testProduct2, expected: ['Blue', 'L', 'M', 'Red', 'S'] },
  { name: 'Color + Material + Size', product: testProduct3, expected: ['Blue', 'Cotton', 'L', 'M', 'Poly', 'Red', 'S'] },
  { name: 'Multi-variant with mixed options', product: testProduct4, expected: ['Black', 'Blue', 'Cotton', 'Green', 'L', 'M', 'Poly', 'Red', 'S', 'XL'] },
  { name: 'Empty/null options filtered out', product: testProduct5, expected: ['L', 'M', 'S'] },
  { name: 'Empty variants array', product: testProduct6, expected: [] },
];

let passedTests = 0;
let failedTests = 0;

for (const testCase of testCases) {
  const result = sizesFromVariants(testCase.product);
  const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);

  if (passed) {
    console.log(`✅ PASS: ${testCase.name}`);
    console.log(`   Result: [${result.join(', ')}]\n`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: ${testCase.name}`);
    console.log(`   Expected: [${testCase.expected.join(', ')}]`);
    console.log(`   Got:      [${result.join(', ')}]\n`);
    failedTests++;
  }
}

console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed`);
process.exit(failedTests > 0 ? 1 : 0);
