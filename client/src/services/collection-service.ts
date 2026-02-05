import { CollectionItem, CollectionItemInput, CollectionStats, PaginatedResponse, SetCompletionSummary, SetCompletionDetail } from '@mtg-binder/shared';
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

export async function uploadCardPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);
  const response = await api.post('/collection/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data.photoUrl;
}

export async function updateCollectionItem(id: string, data: Partial<CollectionItemInput>): Promise<CollectionItem> {
  const response = await api.put(`/collection/${id}`, data);
  return response.data.data;
}

export async function removeFromCollection(id: string): Promise<void> {
  await api.delete(`/collection/${id}`);
}

export async function exportCollection(params: CollectionListParams = {}): Promise<void> {
  const response = await api.get('/collection/export', {
    params,
    responseType: 'blob',
  });

  // Create download link
  const blob = new Blob([response.data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // Extract filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let filename = `mtg-collection-${new Date().toISOString().split('T')[0]}.csv`;

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function getSetCompletions(): Promise<SetCompletionSummary[]> {
  const response = await api.get('/collection/sets');
  return response.data.data;
}

export async function getSetCompletion(setCode: string): Promise<SetCompletionDetail> {
  const response = await api.get(`/collection/sets/${setCode}/completion`);
  return response.data.data;
}
