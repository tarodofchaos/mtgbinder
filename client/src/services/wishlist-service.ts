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

export interface DecklistPreviewItem {
  cardName: string;
  setCode?: string;
  quantity: number;
  ownedQuantity: number;
  matchedCard: {
    id: string;
    name: string;
    setCode: string;
    setName: string;
    scryfallId: string | null;
    priceEur: number | null;
  } | null;
  alreadyInWishlist: boolean;
}

export interface DecklistImportPreview {
  preview: DecklistPreviewItem[];
  priority: WishlistPriority;
  parseErrors: string[];
}

export interface DecklistImportResult {
  imported: number;
  updated: number;
  total: number;
}

export async function importDecklistPreview(
  decklistText: string,
  priority: WishlistPriority
): Promise<DecklistImportPreview> {
  const response = await api.post('/wishlist/import-decklist', { decklistText, priority });
  return response.data.data;
}

export async function confirmDecklistImport(
  cards: { cardId: string; quantity: number }[],
  priority: WishlistPriority
): Promise<DecklistImportResult> {
  const response = await api.post('/wishlist/import-decklist/confirm', { cards, priority });
  return response.data.data;
}
