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
      return validateSizeChartObject(data);
    } catch (err) {
      console.warn('[parseSizeChart] Invalid object format:', err);
      return {};
    }
  }
  
  // If it's a string, try to parse as JSON
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return validateSizeChartObject(parsed);
    } catch (err) {
      console.warn('[parseSizeChart] Failed to parse JSON string:', err);
      return {};
    }
  }
  
  return {};
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
        const num = Number(measureValue);
        if (!isNaN(num) && isFinite(num)) {
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
