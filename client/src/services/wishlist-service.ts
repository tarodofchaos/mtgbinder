import { WishlistItem, WishlistItemInput, PaginatedResponse, WishlistPriority } from '@mtg-binder/shared';
import { api } from './api';

export interface WishlistListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  priority?: WishlistPriority;
  sortBy?: 'name' | 'priority' | 'priceEur' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export async function getWishlist(params: WishlistListParams = {}): Promise<PaginatedResponse<WishlistItem>> {
  const response = await api.get('/wishlist', { params });
  return response.data;
}

export async function addToWishlist(data: WishlistItemInput): Promise<WishlistItem> {
  const response = await api.post('/wishlist', data);
  return response.data.data;
}

export async function updateWishlistItem(id: string, data: Partial<WishlistItemInput>): Promise<WishlistItem> {
  const response = await api.put(`/wishlist/${id}`, data);
  return response.data.data;
}

export async function removeFromWishlist(id: string): Promise<void> {
  await api.delete(`/wishlist/${id}`);
}
