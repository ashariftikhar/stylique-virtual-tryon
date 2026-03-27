export interface Store {
  id: string;
  store_name: string;
  store_id: string;
  email?: string;
  phone?: string;
}

export type SizeMeasurements = Record<
  string,
  {
    width?: number;
    height?: number;
    waist?: number;
    shoulder?: number;
    chest?: number;
    length?: number;
    sleeve?: number;
    inseam?: number;
  }
>;

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
