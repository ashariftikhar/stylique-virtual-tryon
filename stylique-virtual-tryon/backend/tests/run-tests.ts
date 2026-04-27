import assert from 'node:assert/strict';
import { buildCompleteLookPayload } from '../src/routes/plugin.ts';
import { computeTier, filterImages } from '../src/routes/images.ts';
import { recommendFromGeneric, recommendFromProductMeasurements } from '../src/routes/recommendations.ts';
import { parseSizeChart } from '../src/utils/htmlUtils.ts';

function testImages() {
  const previousAllowLocal = process.env.ALLOW_LOCAL_IMAGE_URLS;

  process.env.ALLOW_LOCAL_IMAGE_URLS = 'false';
  const filtered = filterImages(imageFixtures());

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.alt, 'Model front');

  process.env.ALLOW_LOCAL_IMAGE_URLS = 'true';
  const localFiltered = filterImages(imageFixtures());
  assert.equal(localFiltered.length, 2);
  assert.equal(localFiltered[1]?.alt, 'Local product');

  process.env.ALLOW_LOCAL_IMAGE_URLS = 'false';
  const overrideFiltered = filterImages(imageFixtures(), { allowLocalImageUrls: true });
  assert.equal(overrideFiltered.length, 2);
  assert.equal(overrideFiltered[1]?.alt, 'Local product');

  if (previousAllowLocal === undefined) {
    delete process.env.ALLOW_LOCAL_IMAGE_URLS;
  } else {
    process.env.ALLOW_LOCAL_IMAGE_URLS = previousAllowLocal;
  }

  assert.equal(computeTier([{ url: 'a', score: 90 }, { url: 'b', score: 55 }, { url: 'c', score: 40 }, { url: 'd', score: 70 }, { url: 'e', score: 80 }]), 1);
  assert.equal(computeTier([{ url: 'a', score: 90 }, { url: 'b', score: 55 }, { url: 'c', score: 10 }]), 2);
  assert.equal(computeTier([{ url: 'a', score: 90 }, { url: 'b', score: 20 }]), 3);
}

function imageFixtures() {
  return [
    { url: 'https://cdn.example.com/products/model-front.jpg?width=800', alt: 'Model front' },
    { url: 'https://cdn.example.com/products/model-front.jpg?width=1200', alt: 'Duplicate model front' },
    { url: 'https://cdn.example.com/assets/logo.png', alt: 'Brand logo' },
    { url: 'https://cdn.example.com/products/size-chart.png', alt: 'Size chart' },
    { url: 'http://localhost/product.jpg', alt: 'Local product' },
  ];
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

function testCompleteLookPayload() {
  const payload = buildCompleteLookPayload([
    {
      id: 'current-inventory-id',
      product_name: 'Current Product',
      image_url: 'https://cdn.example.com/current.jpg',
      price: 29,
      sizes: ['S', 'M'],
      shopify_product_id: '111',
    },
    {
      id: 'recommended-1',
      product_name: 'Recommended Jacket',
      image_url: 'https://cdn.example.com/jacket-flat.jpg',
      tryon_image_url: 'https://cdn.example.com/jacket-tryon.jpg',
      product_link: 'https://store.example.com/products/jacket',
      price: '79.5',
      sizes: ['M', 'L', 'Default Title'],
    },
    {
      id: 'recommended-2',
      product_name: 'No Image Product',
      price: 10,
    },
  ], '111', 4, 'widget-token');

  assert.equal(payload.success, true);
  assert.equal(payload.widgetToken, 'widget-token');
  assert.equal(payload.items.length, 1);
  assert.equal(payload.products.length, 1);
  assert.equal(payload.outfits.length, 1);
  assert.equal(payload.items[0]?.id, 'recommended-1');
  assert.equal(payload.items[0]?.image_url, 'https://cdn.example.com/jacket-tryon.jpg');
  assert.equal(payload.items[0]?.price, '79.50');
  assert.deepEqual(payload.items[0]?.sizes, ['M', 'L']);
  assert.equal(payload.outfits[0]?.items[0]?.product_name, 'Recommended Jacket');

  const emptyPayload = buildCompleteLookPayload([
    {
      id: 'empty-1',
      product_name: 'Missing Image',
      price: 20,
    },
  ], undefined, 4);

  assert.deepEqual(emptyPayload.items, []);
  assert.deepEqual(emptyPayload.products, []);
  assert.deepEqual(emptyPayload.outfits, []);
  assert.equal(emptyPayload.reasoning, 'No same-store synced recommendations are available yet.');
}

function testShopifyRichTextSizeChart() {
  const rawChart = '{"XS": { "chest": 34, "shoulder": 15, "length": 24 }, "S": { "chest": "36 in", "shoulder": "16", "length": "25" }}';
  const richTextValue = JSON.stringify({
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: rawChart,
          },
        ],
      },
    ],
  });

  const parsed = parseSizeChart(richTextValue);

  assert.deepEqual(Object.keys(parsed).sort(), ['S', 'XS']);
  assert.equal(parsed.XS?.chest, 34);
  assert.equal(parsed.S?.chest, 36);
  assert.equal(parsed.S?.shoulder, 16);
}

testImages();
testRecommendations();
testCompleteLookPayload();
testShopifyRichTextSizeChart();

console.log('Backend focused tests passed');
