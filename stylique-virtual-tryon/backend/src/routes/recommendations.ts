import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const router: Router = express.Router();

interface UserMeasurements {
  chest?: number;
  waist?: number;
  hips?: number;
  height?: number;
  inseam?: number;
  bust?: number;
  shoulder?: number;
  sleeve?: number;
}

interface RecommendationPayload {
  product_id: string;
  measurements: UserMeasurements;
}

// Generic fallback ranges (cm)
const GENERIC_SIZE_RANGES: Record<string, Record<string, [number, number]>> = {
  XS:  { chest: [78, 85],  waist: [58, 68],  hips: [82, 92] },
  S:   { chest: [85, 92],  waist: [68, 78],  hips: [92, 102] },
  M:   { chest: [92, 102], waist: [78, 88],  hips: [102, 112] },
  L:   { chest: [102, 112], waist: [88, 98],  hips: [112, 122] },
  XL:  { chest: [112, 122], waist: [98, 108], hips: [122, 132] },
  XXL: { chest: [122, 132], waist: [108, 118], hips: [132, 142] },
  '2XL': { chest: [122, 132], waist: [108, 118], hips: [132, 142] },
  '3XL': { chest: [132, 142], waist: [118, 128], hips: [142, 152] },
};

type MeasurementKey = 'chest' | 'waist' | 'hips' | 'shoulder' | 'sleeve' | 'inseam' | 'height' | 'bust';
const MEASUREMENT_WEIGHTS: Partial<Record<MeasurementKey, number>> = {
  chest: 35, waist: 35, hips: 20, shoulder: 5, sleeve: 5,
};

function scoreForRange(value: number, range: [number, number], weight: number): number {
  if (value >= range[0] && value <= range[1]) return weight;
  const distance = Math.min(Math.abs(value - range[0]), Math.abs(value - range[1]));
  return Math.max(0, weight - distance / 2);
}

/**
 * Score using product-specific measurements JSONB.
 * Expected shape: { "S": { chest: 90, waist: 75, ... }, "M": { ... } }
 */
function recommendFromProductMeasurements(
  userM: UserMeasurements,
  productMeasurements: Record<string, Record<string, number>>,
  availableSizes: string[],
): { recommended: string; alternatives: string[]; confidence: string; source: string } {
  const scores: Record<string, number> = {};

  for (const size of availableSizes) {
    const key = size.toUpperCase();
    const sizeData = productMeasurements[key] || productMeasurements[size];
    if (!sizeData) continue;

    let total = 0;
    let maxPossible = 0;

    for (const [field, weight] of Object.entries(MEASUREMENT_WEIGHTS)) {
      const userVal = userM[field as MeasurementKey];
      const prodVal = sizeData[field];
      if (userVal == null || prodVal == null) continue;

      maxPossible += weight;
      // Product measurement is a single value; create a +-3 cm tolerance band
      const lo = prodVal - 3;
      const hi = prodVal + 3;
      total += scoreForRange(userVal, [lo, hi], weight);
    }

    scores[key] = maxPossible > 0 ? (total / maxPossible) * 100 : 0;
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);

  const topScore = scores[sorted[0] || ''] ?? 0;

  return {
    recommended: sorted[0] || availableSizes[0] || 'M',
    alternatives: sorted.slice(1, 3),
    confidence: topScore >= 75 ? 'high' : topScore >= 50 ? 'medium' : 'low',
    source: 'product_specific',
  };
}

function recommendFromGeneric(
  userM: UserMeasurements,
  availableSizes: string[],
): { recommended: string; alternatives: string[]; confidence: string; source: string } {
  const scores: Record<string, number> = {};

  for (const size of availableSizes) {
    const key = size.toUpperCase();
    const range = GENERIC_SIZE_RANGES[key];
    if (!range) continue;

    let total = 0;
    if (userM.chest && range.chest) total += scoreForRange(userM.chest, range.chest, 40);
    if (userM.waist && range.waist) total += scoreForRange(userM.waist, range.waist, 40);
    if (userM.hips && range.hips)   total += scoreForRange(userM.hips, range.hips, 20);

    scores[key] = total;
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);

  return {
    recommended: sorted[0] || availableSizes[0] || 'M',
    alternatives: sorted.slice(1, 3),
    confidence: 'medium',
    source: 'generic',
  };
}

// POST /api/recommend-size
router.post('/recommend-size', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: RecommendationPayload = req.body;
    const authStoreId = (req as AuthenticatedRequest).storeAuth?.storeId;

    if (!payload.product_id || !payload.measurements) {
      return res.status(400).json({
        error: 'Missing required fields: product_id and measurements',
      });
    }
    if (!authStoreId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: product, error: productError } = await supabase
      .from('inventory')
      .select('sizes, measurements')
      .eq('id', payload.product_id)
      .eq('store_id', authStoreId)
      .maybeSingle();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Product not found',
        details: `No product found with id: ${payload.product_id}`,
      });
    }

    const availableSizes = product.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    const hasProductMeasurements =
      product.measurements &&
      typeof product.measurements === 'object' &&
      Object.keys(product.measurements).length > 0;

    const recommendation = hasProductMeasurements
      ? recommendFromProductMeasurements(payload.measurements, product.measurements, availableSizes)
      : recommendFromGeneric(payload.measurements, availableSizes);

    console.log(`[Size] product=${payload.product_id} source=${recommendation.source} => ${recommendation.recommended}`);

    res.status(200).json({
      status: 'success',
      message: 'Size recommendation generated',
      recommendation: {
        recommended: recommendation.recommended,
        alternatives: recommendation.alternatives,
        confidence: recommendation.confidence,
        source: recommendation.source,
      },
      userMeasurements: payload.measurements,
    });
  } catch (error: any) {
    console.error('Error recommending size:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

export { recommendFromProductMeasurements, recommendFromGeneric };
export default router;
