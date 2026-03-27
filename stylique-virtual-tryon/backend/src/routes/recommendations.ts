import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';

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

// Simple size mapping based on measurements
function recommendSizeFromMeasurements(
  measurements: UserMeasurements,
  availableSizes: string[]
): { recommended: string; alternatives: string[] } {
  // Normalize measurements to cm
  const chest = measurements.chest || 0;
  const waist = measurements.waist || 0;
  const hips = measurements.hips || 0;

  // Simple mapping logic
  let score: { [key: string]: number } = {};
  const sizeRanges: { [key: string]: { chest: [number, number]; waist: [number, number]; hips: [number, number] } } = {
    XS: { chest: [78, 85], waist: [58, 68], hips: [82, 92] },
    S: { chest: [85, 92], waist: [68, 78], hips: [92, 102] },
    M: { chest: [92, 102], waist: [78, 88], hips: [102, 112] },
    L: { chest: [102, 112], waist: [88, 98], hips: [112, 122] },
    XL: { chest: [112, 122], waist: [98, 108], hips: [122, 132] },
    XXL: { chest: [122, 132], waist: [108, 118], hips: [132, 142] },
  };

  // Calculate score for each size
  availableSizes.forEach((size) => {
    const range = sizeRanges[size.toUpperCase()];
    if (!range) return;

    let matchScore = 0;

    // Score based on chest
    if (chest >= range.chest[0] && chest <= range.chest[1]) {
      matchScore += 40;
    } else {
      const distance = Math.min(
        Math.abs(chest - range.chest[0]),
        Math.abs(chest - range.chest[1])
      );
      matchScore += Math.max(0, 40 - distance / 2);
    }

    // Score based on waist
    if (waist >= range.waist[0] && waist <= range.waist[1]) {
      matchScore += 40;
    } else {
      const distance = Math.min(
        Math.abs(waist - range.waist[0]),
        Math.abs(waist - range.waist[1])
      );
      matchScore += Math.max(0, 40 - distance / 2);
    }

    // Score based on hips
    if (hips >= range.hips[0] && hips <= range.hips[1]) {
      matchScore += 20;
    } else {
      const distance = Math.min(
        Math.abs(hips - range.hips[0]),
        Math.abs(hips - range.hips[1])
      );
      matchScore += Math.max(0, 20 - distance / 2);
    }

    score[size.toUpperCase()] = matchScore;
  });

  // Get sorted recommendations
  const sorted = Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .map(([size]) => size);

  return {
    recommended: sorted[0] || availableSizes[0] || 'M',
    alternatives: sorted.slice(1, 3),
  };
}

// POST /api/recommend-size
router.post('/recommend-size', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: RecommendationPayload = req.body;

    // Validate input
    if (!payload.product_id || !payload.measurements) {
      return res.status(400).json({
        error: 'Missing required fields: product_id and measurements',
      });
    }

    // Fetch product to get available sizes
    const { data: product, error: productError } = await supabase
      .from('inventory')
      .select('sizes')
      .eq('id', payload.product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Product not found',
        details: `No product found with id: ${payload.product_id}`,
      });
    }

    const availableSizes = product.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    // Get size recommendation
    const recommendation = recommendSizeFromMeasurements(payload.measurements, availableSizes);

    res.status(200).json({
      status: 'success',
      message: 'Size recommendation generated',
      recommendation: {
        recommended: recommendation.recommended,
        alternatives: recommendation.alternatives,
        confidence: 'medium',
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

export default router;
