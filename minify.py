import re
import os

file_path = r"stylique-virtual-tryon/shopify/Shopify_new_tryon_upload_first.liquid"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

original_size = len(content.encode('utf-8'))
print(f"Original size: {original_size / 1024:.1f} KB")

# Step 1: Remove CSS comments /* ... */
content = re.sub(r'/\*[\s\S]*?\*/', '', content)
print("Step 1: CSS comments removed")

# Step 2: Remove JS comments // ... (but be careful with URLs)
# Only remove // comments that are on their own or at the end of a line
content = re.sub(r'//.*?(?=\n)', '', content)
print("Step 2: JS comments removed")

# Step 3: Condense multiple spaces to single space
content = re.sub(r'[ \t]+', ' ', content)
print("Step 3: Multiple spaces condensed")

# Step 4: Remove newlines except where needed
# Replace multiple newlines with single newline first
content = re.sub(r'\n\s*\n+', '\n', content)
content = re.sub(r'\n[ \t]*([{}:;,])', r'\1', content)
content = re.sub(r'([{}:;,])\n[ \t]*', r'\1', content)
print("Step 4: Newlines condensed")

# Step 5: Remove blank lines
content = re.sub(r'^\s*\n', '', content, flags=re.MULTILINE)
print("Step 5: Blank lines removed")

# Step 6: Remove spaces around CSS braces and semicolons
content = re.sub(r'\s*([{}:;])\s*', r'\1', content)
print("Step 6: CSS punctuation spacing removed")

# Step 7: Additional aggressive minification - remove spaces around = and , in specific contexts
content = re.sub(r'\s*([\(\)\[\]=,])\s*', r'\1', content)
print("Step 7: Additional punctuation spacing removed")

new_size = len(content.encode('utf-8'))
reduction = original_size - new_size
reduction_percent = (reduction / original_size) * 100

print(f"\nNew size: {new_size / 1024:.1f} KB")
print(f"Reduction: {reduction / 1024:.1f} KB ({reduction_percent:.1f}%)")
print(f"Target achieved: {new_size < 220 * 1024}")

# Write back the minified content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFile has been minified and saved!")
