const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAuthToken();
    
    console.log(`[API] ${method} ${endpoint} - Token present: ${!!token}`);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add Authorization header if token exists
    if (token) {
      (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      console.log(`[API] Authorization header added`);
    } else {
      console.warn(`[API] No token found in localStorage for ${endpoint}`);
    }

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

  async getStoreConfig(storeId: string) {
    return this.request(`/api/store/${storeId}/config`);
  }

  async getInventory(storeId: string, limit: number = 50, offset: number = 0) {
    return this.request(
      `/api/inventory?store_id=${storeId}&limit=${limit}&offset=${offset}`
    );
  }

  async updateInventory(productId: string, data: any) {
    return this.request(`/api/inventory/${productId}`, 'PATCH', data);
  }

  async processImages(productId: string, images: Array<{ url: string; alt?: string }>) {
    return this.request('/api/process-images', 'POST', {
      product_id: productId,
      images,
    });
  }

  async getAnalytics(storeId: string, limit: number = 100, from?: string, to?: string) {
    let url = `/api/analytics?store_id=${storeId}&limit=${limit}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    return this.request(url);
  }

  async getConversions(storeId: string) {
    return this.request(`/api/analytics/conversions?store_id=${storeId}`);
  }
}

export const apiClient = new ApiClient();
