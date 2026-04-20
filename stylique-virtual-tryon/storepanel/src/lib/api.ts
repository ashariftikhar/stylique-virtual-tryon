const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

type InventoryCreatePayload = {
  store_id: string;
  product_name: string;
  description?: string;
  price?: number;
  image_url?: string;
  sizes?: string[];
};

type InventoryUpdatePayload = {
  deleted?: boolean;
  tier?: number;
  tryon_image_url?: string | null;
};

type ImagePayload = Array<{ url: string; alt?: string }>;

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
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const payload = (await response.json()) as { error?: string; message?: string };
        message = payload.error || payload.message || message;
      } catch {
        // Keep the HTTP status fallback when the backend response is not JSON.
      }
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  async getStoreConfig(storeId: string) {
    return this.request(`/api/store/${encodeURIComponent(storeId)}/config`);
  }

  async getInventory(storeId: string, limit: number = 50, offset: number = 0) {
    return this.request(
      `/api/inventory?store_id=${encodeURIComponent(storeId)}&limit=${limit}&offset=${offset}`,
    );
  }

  async createInventory(data: InventoryCreatePayload) {
    return this.request('/api/inventory', 'POST', data);
  }

  async updateInventory(productId: string, data: InventoryUpdatePayload) {
    return this.request(`/api/inventory/${encodeURIComponent(productId)}`, 'PATCH', data);
  }

  async processImages(productId: string, images: ImagePayload) {
    return this.request('/api/process-images', 'POST', {
      product_id: productId,
      images,
    });
  }

  async getAnalytics(storeId: string, limit: number = 100, from?: string, to?: string) {
    let url = `/api/analytics?store_id=${encodeURIComponent(storeId)}&limit=${limit}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    return this.request(url);
  }

  async getConversions(storeId: string) {
    return this.request(`/api/analytics/conversions?store_id=${encodeURIComponent(storeId)}`);
  }
}

export const apiClient = new ApiClient();
