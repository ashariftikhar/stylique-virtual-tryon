const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // Store endpoints
  async getStoreConfig(storeId: string) {
    return this.request(`/api/store/${storeId}/config`);
  }

  // Inventory endpoints
  async getInventory(storeId: string, limit: number = 50, offset: number = 0) {
    return this.request(
      `/api/inventory?store_id=${storeId}&limit=${limit}&offset=${offset}`
    );
  }

  async updateInventory(productId: string, data: any) {
    return this.request(`/api/inventory/${productId}`, 'PATCH', data);
  }

  // Images endpoints
  async processImages(productId: string, images: Array<{ url: string; alt?: string }>) {
    return this.request('/api/process-images', 'POST', {
      product_id: productId,
      images,
    });
  }

  // Analytics endpoints
  async trackTryon(storeId: string, productId?: string, tryonType: string = 'virtual', userId?: string) {
    return this.request('/api/track-tryon', 'POST', {
      store_id: storeId,
      product_id: productId,
      tryon_type: tryonType,
      user_id: userId,
    });
  }

  async getAnalytics(storeId: string, limit: number = 100) {
    return this.request(
      `/api/analytics?store_id=${storeId}&limit=${limit}`
    );
  }

  // Recommendations endpoints
  async getRecommendedSize(
    productId: string,
    measurements: {
      chest?: number;
      waist?: number;
      hips?: number;
      height?: number;
      inseam?: number;
      bust?: number;
      shoulder?: number;
      sleeve?: number;
    }
  ) {
    return this.request('/api/recommend-size', 'POST', {
      product_id: productId,
      measurements,
    });
  }
}

export const apiClient = new ApiClient();
