import assert from 'node:assert/strict';
import { computeTier, filterImages } from '../src/routes/images.ts';
import { recommendFromGeneric, recommendFromProductMeasurements } from '../src/routes/recommendations.ts';

function testImages() {
  const filtered = filterImages([
    { url: 'https://cdn.example.com/products/model-front.jpg?width=800', alt: 'Model front' },
    { url: 'https://cdn.example.com/products/model-front.jpg?width=1200', alt: 'Duplicate model front' },
    { url: 'https://cdn.example.com/assets/logo.png', alt: 'Brand logo' },
    { url: 'https://cdn.example.com/products/size-chart.png', alt: 'Size chart' },
    { url: 'http://localhost/product.jpg', alt: 'Local product' },
  ]);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.alt, 'Model front');

  assert.equal(computeTier([{ url: 'a', score: 90 }, { url: 'b', score: 55 }, { url: 'c', score: 40 }, { url: 'd', score: 70 }, { url: 'e', score: 80 }]), 1);
  assert.equal(computeTier([{ url: 'a', score: 90 }, { url: 'b', score: 55 }, { url: 'c', score: 10 }]), 2);
  assert.equal(computeTier([{ url: 'a', score: 90 }, { url: 'b', score: 20 }]), 3);
}

function testRecommendations() {
  const productSpecific = recommendFromProductMeasurements(
    { chest: 40, waist: 34 },
    {
      S: { chest: 34, waist: 28 },
      M: { chest: 40, waist: 34 },
      L: { chest: 46, waist: 40 },
    },
    ['S', 'M', 'L'],
  );

  assert.equal(productSpecific.recommended, 'M');
  assert.equal(productSpecific.source, 'product_specific');
  assert.deepEqual(productSpecific.alternatives, ['S', 'L']);

  const generic = recommendFromGeneric({ chest: 94, waist: 82 }, ['S', 'M', 'L']);
  assert.equal(generic.recommended, 'M');
  assert.equal(generic.source, 'generic');
  assert.ok(generic.alternatives.length > 0);
}

testImages();
testRecommendations();

console.log('Backend focused tests passed');
