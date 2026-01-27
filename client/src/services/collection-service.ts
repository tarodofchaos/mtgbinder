import { CollectionItem, CollectionItemInput, CollectionStats, PaginatedResponse } from '@mtg-binder/shared';
import { api } from './api';

export interface CollectionListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  setCode?: string;
  colors?: string;
  rarity?: string;
  priceMin?: number;
  priceMax?: number;
  forTrade?: boolean;
  sortBy?: 'name' | 'setCode' | 'priceEur' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export async function getCollection(params: CollectionListParams = {}): Promise<PaginatedResponse<CollectionItem>> {
  const response = await api.get('/collection', { params });
  return response.data;
}

export async function getCollectionStats(): Promise<CollectionStats> {
  const response = await api.get('/collection/stats');
  return response.data.data;
}

export async function addToCollection(data: CollectionItemInput): Promise<CollectionItem> {
  const response = await api.post('/collection', data);
  return response.data.data;
}

export async function updateCollectionItem(id: string, data: Partial<CollectionItemInput>): Promise<CollectionItem> {
  const response = await api.put(`/collection/${id}`, data);
  return response.data.data;
}

export async function removeFromCollection(id: string): Promise<void> {
  await api.delete(`/collection/${id}`);
}
