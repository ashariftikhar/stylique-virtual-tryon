import re
import sys

# File path
file_path = r"C:\Users\SL\OneDrive\Desktop\stylique-phase1\stylique-virtual-tryon\shopify\Shopify_new_tryon_upload_first.liquid"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file size: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 1: Remove Liquid comments {% comment %} ... {% endcomment %}
content = re.sub(r'{%\s*comment\s*%}.*?{%\s*endcomment\s*%}', '', content, flags=re.DOTALL | re.IGNORECASE)
print(f"After removing Liquid comments: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 2: Remove HTML comments <!-- ... -->
content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
print(f"After removing HTML comments: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 3: Remove CSS comments /* ... */
content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
print(f"After removing CSS comments: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 4: Remove multiple spaces (but keep single spaces between words/tags)
content = re.sub(r' {2,}', ' ', content)
print(f"After removing multiple spaces: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 5: Remove blank lines and compress newlines
content = re.sub(r'\n\s*\n+', '\n', content)
print(f"After removing blank lines: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 6: Remove leading/trailing whitespace from lines
lines = content.split('\n')
content = '\n'.join(line.rstrip() for line in lines)
print(f"After removing trailing spaces: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 7: Minify CSS inside <style> blocks
def minify_style_blocks(content):
    def replace_style(match):
        style_content = match.group(1)
        # Remove newlines
        style_content = style_content.replace('\n', ' ')
        # Remove spaces around CSS operators
        style_content = re.sub(r'\s*([{};:,>+~])\s*', r'\1', style_content)
        # Clean up multiple spaces
        style_content = re.sub(r' {2,}', ' ', style_content)
        return f'<style{match.group(2)}>{style_content}</style>'

    content = re.sub(r'<style([^>]*)>(.*?)</style>', replace_style, content, flags=re.DOTALL)
    return content

content = minify_style_blocks(content)
print(f"After minifying style blocks: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 8: Minify JavaScript inside <script> blocks
def minify_script_blocks(content):
    def replace_script(match):
        script_content = match.group(1)
        # Remove newlines (but keep them between statements if needed)
        script_content = script_content.replace('\n', ' ')
        # Remove spaces around operators (aggressive)
        script_content = re.sub(r'\s*([=+\-*/%<>!&|^?:;,()[\]{}])\s*', r'\1', script_content)
        # Clean up multiple spaces
        script_content = re.sub(r' {2,}', ' ', script_content)
        # Remove space before function calls
        script_content = re.sub(r' \(', '(', script_content)
        # Remove space after keywords followed by parenthesis
        script_content = re.sub(r'(if|else|for|while|switch|function|return)\s*\(', r'\1(', script_content)
        return f'<script{match.group(2)}>{script_content}</script>'

    content = re.sub(r'<script([^>]*)>(.*?)</script>', replace_script, content, flags=re.DOTALL)
    return content

content = minify_script_blocks(content)
print(f"After minifying script blocks: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 9: Remove spaces before closing brackets in HTML
content = re.sub(r'\s+>', '>', content)
print(f"After removing space before >: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Step 10: Minify inline style attributes
content = re.sub(r'style="([^"]+)"', lambda m: f'style="{re.sub(r"\s*([{}:;,])\s*", r"\1", m.group(1))}"', content)
print(f"After minifying inline styles: {len(content)} bytes ({len(content)/1024:.2f} KB)")

# Write the minified content back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n=== MINIFICATION COMPLETE ===")
print(f"Final minified file size: {len(content)} bytes ({len(content)/1024:.2f} KB)")
print(f"File successfully minified and written back!")
