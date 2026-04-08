const fs = require('fs');
const path = require('path');

const filePath = './stylique-virtual-tryon/shopify/Shopify_new_tryon_upload_first.liquid';

let content = fs.readFileSync(filePath, 'utf-8');
const originalSize = content.length;

console.log(`Original file size: ${originalSize} bytes (${(originalSize/1024).toFixed(2)} KB)`);

// Step 1: Remove Liquid comments
content = content.replace(/{%\s*comment\s*%}[\s\S]*?{%\s*endcomment\s*%}/gi, '');
console.log(`After removing Liquid comments: ${content.length} bytes`);

// Step 2: Remove HTML comments
content = content.replace(/<!--[\s\S]*?-->/g, '');
console.log(`After removing HTML comments: ${content.length} bytes`);

// Step 3: Remove CSS comments
content = content.replace(/\/\*[\s\S]*?\*\//g, '');
console.log(`After removing CSS comments: ${content.length} bytes`);

// Step 4: Minify CSS blocks
content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
  css = css.replace(/\n/g, ' ');  // Remove newlines
  css = css.replace(/\s*([{}:;,>+~])\s*/g, '$1');  // Remove spaces around operators
  css = css.replace(/\s+/g, ' ');  // Multiple spaces to single
  return `<style>${css.trim()}</style>`;
});
console.log(`After minifying CSS blocks: ${content.length} bytes`);

// Step 5: Minify JS blocks
content = content.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, js) => {
  js = js.replace(/\n/g, ' ');  // Remove newlines
  js = js.replace(/\s*([=+\-*/%<>!&|^?:;,()[\]{}])\s*/g, '$1');  // Remove spaces around operators
  js = js.replace(/\s+/g, ' ');  // Multiple spaces to single
  js = js.replace(/\s*\(/g, '(');  // Remove space before (
  return `<script>${js.trim()}</script>`;
});
console.log(`After minifying JS blocks: ${content.length} bytes`);

// Step 6: Remove multiple spaces
content = content.replace(/  +/g, ' ');
console.log(`After removing multiple spaces: ${content.length} bytes`);

// Step 7: Remove blank lines
content = content.replace(/\n\s*\n+/g, '\n');
console.log(`After removing blank lines: ${content.length} bytes`);

// Step 8: Remove trailing whitespace on lines
content = content.split('\n').map(line => line.trimRight()).join('\n');
console.log(`After removing trailing spaces: ${content.length} bytes`);

// Step 9: Remove space before >
content = content.replace(/\s+>/g, '>');
console.log(`After removing space before >: ${content.length} bytes`);

// Step 10: Minify inline styles
content = content.replace(/style="([^"]*)"/g, (match, style) => {
  style = style.replace(/\s*([{}:;,])\s*/g, '$1');
  return `style="${style}"`;
});
console.log(`After minifying inline styles: ${content.length} bytes`);

// Write back
fs.writeFileSync(filePath, content, 'utf-8');

const finalSize = content.length;
const reduction = originalSize - finalSize;
const reductionPct = ((reduction / originalSize) * 100).toFixed(1);

console.log(`\n=== MINIFICATION COMPLETE ===`);
console.log(`Final file size: ${finalSize} bytes (${(finalSize/1024).toFixed(2)} KB)`);
console.log(`Reduction: ${reduction} bytes (${reductionPct}%)`);
console.log(`File successfully minified and written back!`);
