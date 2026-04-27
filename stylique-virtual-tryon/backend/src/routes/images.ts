import express from 'express';
import type { Router, Request, Response } from 'express';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { getSupabase } from '../services/supabase.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const router: Router = express.Router();

// Labels that indicate an image is good for virtual try-on
const TRYON_POSITIVE_LABELS = [
  'person', 'human', 'clothing', 'apparel', 'fashion', 'dress', 'shirt',
  'pants', 'jacket', 'coat', 'top', 'blouse', 'skirt', 'suit', 'jeans',
  'outerwear', 'sleeve', 'collar', 'wear', 'standing', 'man', 'woman',
  'model', 'portrait', 'outfit',
];

const TRYON_NEGATIVE_LABELS = [
  'logo', 'text', 'screenshot', 'collage', 'advertisement', 'poster',
  'meme', 'animal', 'food', 'car', 'vehicle', 'furniture',
];

interface ImageCandidate {
  url: string;
  alt?: string;
}

interface ScoredImage extends ImageCandidate {
  score: number;
  labels?: string[];
}

const NEGATIVE_TEXT_HINTS = [
  'placeholder', 'coming soon', 'logo', 'size chart', 'size-chart', 'measurement',
  'measurements', 'guide', 'swatch', 'fabric', 'texture', 'detail', 'closeup',
  'close-up', 'zoom', 'banner', 'poster', 'lookbook', 'icon', 'thumbnail',
];

const POSITIVE_TEXT_HINTS = [
  'model', 'front', 'full', 'body', 'wearing', 'worn', 'outfit', 'product',
  'dress', 'shirt', 'top', 'jacket', 'coat', 'pants', 'jeans', 'skirt',
];

const STRONG_POSITIVE_TEXT_HINTS = ['model', 'front', 'full', 'body', 'wearing', 'worn'];

function allowLocalImageUrls(): boolean {
  return ['true', '1', 'yes'].includes(String(process.env.ALLOW_LOCAL_IMAGE_URLS || '').toLowerCase());
}

function isLocalOrPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (
    normalized === 'localhost' ||
    normalized.endsWith('.local') ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '[::1]' ||
    normalized.startsWith('10.') ||
    normalized.startsWith('192.168.')
  ) {
    return true;
  }

  const private172 = normalized.match(/^172\.(\d+)\./);
  if (private172) {
    const secondOctet = Number(private172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    if (isLocalOrPrivateHostname(url.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isAllowedHttpImageUrl(value: string): boolean {
  if (isPublicHttpUrl(value)) {
    return true;
  }

  if (!allowLocalImageUrls()) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && isLocalOrPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// Rule-based pre-filter
// ──────────────────────────────────────────────
function imageText(img: ImageCandidate): string {
  let path = '';
  try {
    path = decodeURIComponent(new URL(img.url).pathname || '');
  } catch {
    path = img.url || '';
  }
  return `${img.alt || ''} ${path}`.toLowerCase();
}

function imageDedupeKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function hasTextHint(text: string, hints: string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

export function filterImages(images: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  const accepted: ImageCandidate[] = [];

  for (const img of images) {
    if (!img.url || !isAllowedHttpImageUrl(img.url)) continue;

    const key = imageDedupeKey(img.url);
    if (seen.has(key)) continue;
    seen.add(key);

    const text = imageText(img);
    if (hasTextHint(text, NEGATIVE_TEXT_HINTS) && !hasTextHint(text, STRONG_POSITIVE_TEXT_HINTS)) {
      console.log(`[Images] rejected by text hints: alt="${img.alt || ''}" url=${img.url.slice(0, 80)}`);
      continue;
    }

    accepted.push(img);
  }

  return accepted;
}

function heuristicImageScore(imageUrl: string, alt?: string): number {
  const text = `${imageUrl} ${alt || ''}`.toLowerCase();
  let score = 58;

  if (hasTextHint(text, POSITIVE_TEXT_HINTS)) score += 14;
  if (text.includes('model') || text.includes('wearing') || text.includes('front')) score += 10;
  if (text.includes('large') || text.includes('high') || text.includes('hq') || text.includes('2048')) score += 8;
  if (hasTextHint(text, NEGATIVE_TEXT_HINTS)) score -= 35;

  return Math.max(0, Math.min(100, score));
}

// ──────────────────────────────────────────────
// AWS Rekognition scoring
// ──────────────────────────────────────────────
let rekognitionClient: RekognitionClient | null = null;

function getRekognition(): RekognitionClient | null {
  if (rekognitionClient) return rekognitionClient;

  const region = process.env.AWS_REGION || 'us-east-1';
  const hasCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

  if (!hasCredentials) {
    console.warn('[Images] AWS credentials not set – using mock scoring. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.');
    return null;
  }

  rekognitionClient = new RekognitionClient({ region });
  return rekognitionClient;
}

async function scoreImageWithRekognition(imageUrl: string, alt?: string): Promise<{ score: number; labels: string[] }> {
  if (!isPublicHttpUrl(imageUrl) && allowLocalImageUrls()) {
    return {
      score: heuristicImageScore(imageUrl, alt),
      labels: ['local-heuristic-scored'],
    };
  }

  const client = getRekognition();

  if (!client) {
    // Fallback mock scoring when AWS is not configured
    return {
      score: heuristicImageScore(imageUrl, alt),
      labels: ['heuristic-scored'],
    };
  }

  try {
    // Fetch the image as bytes for Rekognition
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return { score: 20, labels: ['fetch-failed'] };
    }
    const buffer = await response.arrayBuffer();

    const command = new DetectLabelsCommand({
      Image: { Bytes: new Uint8Array(buffer) },
      MaxLabels: 20,
      MinConfidence: 40,
    });

    const result = await client.send(command);
    const detectedLabels = (result.Labels || []).map(l => ({
      name: (l.Name || '').toLowerCase(),
      confidence: l.Confidence || 0,
    }));

    const labelNames = detectedLabels.map(l => l.name);

    let score = 0;
    let positiveHits = 0;

    // Positive signals: clothing/person labels boost score
    for (const label of detectedLabels) {
      if (TRYON_POSITIVE_LABELS.some(pos => label.name.includes(pos))) {
        score += label.confidence * 0.08;
        positiveHits++;
      }
    }

    // Negative signals: logos, text, animals reduce score
    for (const label of detectedLabels) {
      if (TRYON_NEGATIVE_LABELS.some(neg => label.name.includes(neg))) {
        score -= label.confidence * 0.05;
      }
    }

    // Base score: any image with at least 2 clothing-related labels gets a minimum
    if (positiveHits >= 2) {
      score = Math.max(score, 35);
    }

    // Bonus if image has both "person" and "clothing" type labels
    const hasPerson = labelNames.some(n => n.includes('person') || n.includes('human') || n.includes('man') || n.includes('woman') || n.includes('adult'));
    const hasClothing = labelNames.some(n =>
      n.includes('clothing') || n.includes('apparel') || n.includes('fashion') ||
      n.includes('shirt') || n.includes('jacket') || n.includes('coat') ||
      n.includes('pants') || n.includes('dress') || n.includes('sleeve'));
    if (hasPerson && hasClothing) {
      score += 20;
    } else if (hasClothing) {
      score += 10;
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      labels: labelNames,
    };
  } catch (error) {
    console.error('[Images] Rekognition error:', error);
    return { score: 0, labels: ['rekognition-error'] };
  }
}

// ──────────────────────────────────────────────
// Tier assignment
// Tier 1: >= 5 usable images (score >= 40)
// Tier 2: 2-4 usable images
// Tier 3: <= 1 usable image
// ──────────────────────────────────────────────
export function computeTier(scoredImages: ScoredImage[]): number {
  const usable = scoredImages.filter(img => img.score >= 40).length;
  if (usable >= 5) return 1;
  if (usable >= 2) return 2;
  return 3;
}

// ──────────────────────────────────────────────
// Exported function for use by sync routes
// ──────────────────────────────────────────────
export async function processProductImages(
  productId: string,
  images: ImageCandidate[],
): Promise<{ bestUrl: string; tier: number; scoredImages: ScoredImage[] }> {
  const supabase = getSupabase();

  console.log(`[Images] processProductImages: product=${productId} received=${images.length} images`);

  const filtered = filterImages(images);
  console.log(`[Images] After filtering: ${filtered.length}/${images.length} passed`);

  if (filtered.length === 0) {
    console.log(`[Images] No usable images — assigning tier=3`);
    await supabase
      .from('inventory')
      .update({
        tryon_image_url: null,
        tier: 3,
        quality_score: 0,
        images,
      })
      .eq('id', productId);
    return { bestUrl: '', tier: 3, scoredImages: [] };
  }

  const scoredImages: ScoredImage[] = await Promise.all(
    filtered.map(async (img) => {
      const { score, labels } = await scoreImageWithRekognition(img.url, img.alt);
      console.log(`[Images]   score=${score} labels=[${labels.slice(0, 5).join(', ')}] url=${img.url.slice(0, 70)}…`);
      return { ...img, score, labels };
    }),
  );

  const sorted = [...scoredImages].sort((a, b) => b.score - a.score);
  const bestUrl = sorted[0]?.url || '';
  const tier = computeTier(scoredImages);
  const usable = scoredImages.filter(i => i.score >= 40);
  console.log(`[Images] Scores summary: ${scoredImages.map(i => i.score).join(', ')} | usable(≥40): ${usable.length}/${scoredImages.length} → tier=${tier}`);

  // Persist to inventory
  const bestScore = sorted[0]?.score ?? 0;
  
  // Get current images array before updating
  const { data: currentProduct, error: fetchError } = await supabase
    .from('inventory')
    .select('images')
    .eq('id', productId)
    .single();
  
  const currentImages = currentProduct?.images || [];
  
  console.log('[Images] Current images array before update:', currentImages);
  
  const { error } = await supabase
    .from('inventory')
    .update({ 
      tryon_image_url: bestUrl, 
      tier, 
      quality_score: bestScore,
      images: currentImages // Preserve existing images array
    })
    .eq('id', productId);

  if (error) {
    console.error(`[Images] Failed to update product ${productId}:`, error.message);
  } else {
    console.log(`[Images] product=${productId} best=${bestUrl.slice(0, 60)}… tier=${tier} quality_score=${bestScore} usable=${scoredImages.filter(i => i.score >= 40).length} images_count=${currentImages.length}`);
  }

  return { bestUrl, tier, scoredImages: sorted };
}

// ──────────────────────────────────────────────
// POST /api/process-images
// ──────────────────────────────────────────────
router.post('/process-images', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload = req.body;
    const authStoreId = (req as AuthenticatedRequest).storeAuth?.storeId;

    if (!payload.product_id || !payload.images || payload.images.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: product_id and images array' });
    }
    if (!authStoreId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: product, error: productError } = await supabase
      .from('inventory')
      .select('id')
      .eq('id', payload.product_id)
      .eq('store_id', authStoreId)
      .maybeSingle();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { bestUrl, tier, scoredImages } = await processProductImages(payload.product_id, payload.images);

    if (!bestUrl) {
      return res.status(400).json({ error: 'No valid images after filtering' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Images processed, best image selected and tier assigned',
      selectedImage: { url: bestUrl, score: scoredImages[0]?.score },
      tier,
      scoredImages: scoredImages.map(({ url, score, labels }) => ({ url, score, labels })),
    });
  } catch (error: any) {
    console.error('[Images] process-images error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
