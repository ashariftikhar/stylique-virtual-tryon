import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';

const router: Router = express.Router();

interface ProcessImagesPayload {
  product_id: string;
  images: Array<{
    url: string;
    alt?: string;
  }>;
}

interface RekognitionScore {
  Confidence: number;
  Name: string;
}

// Rule-based filtering for images
function filterImages(images: Array<{ url: string; alt?: string }>): Array<{ url: string; alt?: string }> {
  return images.filter((img) => {
    // Filter out images with low quality indicators
    if (img.alt && (img.alt.toLowerCase().includes('placeholder') || img.alt.toLowerCase().includes('coming soon'))) {
      return false;
    }
    // Basic URL validation
    if (!img.url || !img.url.startsWith('http')) {
      return false;
    }
    return true;
  });
}

// Mock AWS Rekognition scoring - in production, call actual AWS Rekognition API
async function scoreImageWithRekognition(imageUrl: string): Promise<number> {
  try {
    // TODO: Implement actual AWS Rekognition call using AWS SDK
    // For now, return a mock score based on image properties
    // In production: 
    // const rekognition = new AWS.Rekognition();
    // const response = await rekognition.detectCustomLabels({...}).promise();
    
    // Mock implementation - return score between 0-100
    const baseScore = 75;
    const urlQualityBonus = imageUrl.includes('-hq') || imageUrl.includes('-high') ? 15 : 0;
    return Math.min(100, baseScore + urlQualityBonus);
  } catch (error) {
    console.error('Error scoring image with Rekognition:', error);
    return 50; // Default score on error
  }
}

// POST /api/process-images
router.post('/process-images', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: ProcessImagesPayload = req.body;

    // Validate input
    if (!payload.product_id || !payload.images || payload.images.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: product_id and images array',
      });
    }

    // Step 1: Rule-based filtering
    const filteredImages = filterImages(payload.images);

    if (filteredImages.length === 0) {
      return res.status(400).json({
        error: 'No valid images after filtering',
      });
    }

    // Step 2: Score images with Rekognition
    const scoredImages = await Promise.all(
      filteredImages.map(async (img) => ({
        url: img.url,
        alt: img.alt,
        score: await scoreImageWithRekognition(img.url),
      }))
    );

    // Step 3: Select best image (highest score)
    const bestImage = scoredImages.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // Step 4: Update inventory with selected image
    const { data, error } = await supabase
      .from('inventory')
      .update({
        tryon_image_url: bestImage.url,
      })
      .eq('id', payload.product_id);

    if (error) {
      return res.status(500).json({
        error: 'Failed to update product with selected image',
        details: error.message,
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Image processed and stored successfully',
      selectedImage: {
        url: bestImage.url,
        score: bestImage.score,
      },
      scoredImages: scoredImages.sort((a, b) => b.score - a.score),
    });
  } catch (error: any) {
    console.error('Error processing images:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

export default router;
