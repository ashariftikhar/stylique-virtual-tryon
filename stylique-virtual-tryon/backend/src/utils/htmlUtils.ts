/**
 * Utility functions for HTML processing
 */

/**
 * Strip HTML tags from a string.
 * Uses a simple regex approach - suitable for general HTML content.
 * Handles common cases like <p>, <br>, <span>, etc.
 */
export function stripHtmlTags(html: string | null | undefined): string {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html
    .replace(/<br\s*\/?>/gi, ' ') // Convert <br> to space
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Convert &nbsp; to space
    .replace(/&amp;/g, '&') // Decode &amp;
    .replace(/&lt;/g, '<') // Decode &lt;
    .replace(/&gt;/g, '>') // Decode &gt;
    .replace(/&quot;/g, '"') // Decode &quot;
    .replace(/&#39;/g, "'") // Decode &#39;
    .trim();
  
  // Collapse multiple spaces
  text = text.replace(/\s+/g, ' ');
  
  return text;
}

/**
 * Parse size chart JSON from metafield or meta value.
 * Expected format: either a JSON string or already-parsed object.
 * Returns parsed object or empty object if parsing fails.
 * 
 * Expected shape:
 * {
 *   "S": { "chest": 90, "waist": 75, "shoulder": 38, "sleeve": 58, "length": 65 },
 *   "M": { "chest": 98, "waist": 83, "shoulder": 42, "sleeve": 61, "length": 68 },
 *   "L": { "chest": 106, "waist": 91, "shoulder": 46, "sleeve": 64, "length": 71 }
 * }
 */
export function parseSizeChart(data: any): Record<string, Record<string, number>> {
  if (!data) return {};
  
  // If already an object, validate it
  if (typeof data === 'object') {
    try {
      const direct = validateSizeChartObject(data);
      if (Object.keys(direct).length > 0) return direct;

      const richText = extractRichTextValue(data);
      return richText ? parseSizeChart(richText) : {};
    } catch (err) {
      console.warn('[parseSizeChart] Invalid object format:', err);
      return {};
    }
  }
  
  // If it's a string, try to parse as JSON
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      const direct = validateSizeChartObject(parsed);
      if (Object.keys(direct).length > 0) return direct;

      const richText = extractRichTextValue(parsed);
      if (richText) return parseSizeChart(richText);

      return {};
    } catch (err) {
      const parsedTable = parseHtmlSizeChart(data);
      if (Object.keys(parsedTable).length > 0) {
        return parsedTable;
      }

      console.warn('[parseSizeChart] Failed to parse JSON/table string:', err);
      return {};
    }
  }
  
  return {};
}

function extractRichTextValue(value: unknown): string {
  const parts: string[] = [];

  function visit(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;

    if (record.type === 'text' && typeof record.value === 'string') {
      parts.push(record.value);
    }

    if (Array.isArray(record.children)) {
      record.children.forEach(visit);
    }
  }

  visit(value);
  return parts.join('\n').trim();
}

function normalizeMeasurementKey(value: string): string {
  return stripHtmlTags(value)
    .toLowerCase()
    .replace(/\(.+?\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function looksLikeMeasurementKey(value: string): boolean {
  const normalized = normalizeMeasurementKey(value);
  return [
    'bust',
    'chest',
    'waist',
    'hips',
    'hip',
    'shoulder',
    'sleeve',
    'length',
    'inseam',
    'height',
  ].includes(normalized);
}

function toMeasurementNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const matches = stripHtmlTags(value).match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const numbers = matches.map(Number).filter(Number.isFinite);
  if (numbers.length === 0) {
    return null;
  }

  if (numbers.length >= 2 && /-|to/i.test(value)) {
    const first = numbers[0];
    const second = numbers[1];
    if (first != null && second != null) {
      return Math.round(((first + second) / 2) * 10) / 10;
    }
  }

  return numbers[0] ?? null;
}

function parseTableRows(html: string): string[][] {
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  return rowMatches
    .map((row) => {
      const cellMatches = row.match(/<(?:th|td)[^>]*>[\s\S]*?<\/(?:th|td)>/gi) || [];
      return cellMatches
        .map((cell) => stripHtmlTags(cell).trim())
        .filter((cell) => cell !== '');
    })
    .filter((row) => row.length > 1);
}

function parseHtmlSizeChart(html: string): Record<string, Record<string, number>> {
  if (!/<table|<tr|<td|<th/i.test(html)) {
    return {};
  }

  const rows = parseTableRows(html);
  if (rows.length < 2) {
    return {};
  }

  const headers = rows[0] || [];
  const bodyRows = rows.slice(1);
  const headerMeasurements = headers.slice(1).filter(looksLikeMeasurementKey).length;
  const result: Record<string, Record<string, number>> = {};

  if (headerMeasurements > 0) {
    for (const row of bodyRows) {
      const size = row[0]?.trim();
      if (!size) continue;

      const measurements: Record<string, number> = {};
      headers.slice(1).forEach((header, index) => {
        const key = normalizeMeasurementKey(header);
        const value = toMeasurementNumber(row[index + 1]);
        if (key && value != null) {
          measurements[key] = value;
        }
      });

      if (Object.keys(measurements).length > 0) {
        result[size] = measurements;
      }
    }
  } else {
    const sizes = headers.slice(1).map((size) => size.trim()).filter(Boolean);
    for (const size of sizes) {
      result[size] = {};
    }

    for (const row of bodyRows) {
      const key = normalizeMeasurementKey(row[0] || '');
      if (!key) continue;

      row.slice(1).forEach((value, index) => {
        const size = sizes[index];
        const numberValue = toMeasurementNumber(value);
        if (size && numberValue != null) {
          result[size] = result[size] || {};
          result[size][key] = numberValue;
        }
      });
    }

    for (const size of Object.keys(result)) {
      const measurements = result[size] || {};
      if (Object.keys(measurements).length === 0) {
        delete result[size];
      }
    }
  }

  return result;
}

/**
 * Validate that the object has the expected size chart structure.
 */
function validateSizeChartObject(obj: any): Record<string, Record<string, number>> {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('Size chart must be an object');
  }
  
  const result: Record<string, Record<string, number>> = {};
  
  for (const [sizeKey, sizeData] of Object.entries(obj)) {
    if (typeof sizeData === 'object' && sizeData !== null && !Array.isArray(sizeData)) {
      const measurements: Record<string, number> = {};
      let hasValidMeasurement = false;
      
      for (const [measureKey, measureValue] of Object.entries(sizeData)) {
        const num = toMeasurementNumber(measureValue);
        if (num != null) {
          measurements[measureKey] = num;
          hasValidMeasurement = true;
        }
      }
      
      // Only include size if it has at least one valid measurement
      if (hasValidMeasurement) {
        result[sizeKey] = measurements;
      }
    }
  }
  
  return result;
}
