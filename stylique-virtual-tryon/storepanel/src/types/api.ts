export interface StoreConfig {
  id: string;
  store_name: string;
  store_id: string;
  email?: string;
  phone?: string;
  subscription_plan?: string;
  subscription_name?: string;
  subscription_start_at?: string;
  subscription_end_at?: string;
  tryons_quota: number;
  tryons_used: number;
  tryons_remaining: number;
}

export interface InventoryItem {
  id: string;
  store_id: string;
  product_name: string;
  description?: string;
  price?: number;
  image_url?: string;
  tryon_image_url?: string;
  sizes: string[];
  measurements?: Record<string, any>;
  product_link?: string;
  category?: string;
  brand?: string;
  tier?: number;
  quality_score?: number;
  shopify_product_id?: string;
  woocommerce_product_id?: string;
  sync_status?: 'success' | 'pending' | 'failed';
  created_at?: string;
  updated_at?: string;
}

export interface TryonAnalytics {
  id: string;
  store_id: string;
  product_id?: string;
  user_id?: string;
  tryon_type: string;
  created_at: string;
  redirect_status: boolean;
}

export interface SizeRecommendation {
  recommended: string;
  alternatives: string[];
  confidence: string;
}

export interface Store {
  id: string;
  store_name: string;
  store_id: string;
  email?: string;
  phone?: string;
}
