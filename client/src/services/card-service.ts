import { Card, PaginatedResponse, CardAutocompleteResult } from '@mtg-binder/shared';
import { api } from './api';

export interface CardSearchParams {
  q?: string;
  setCode?: string;
  rarity?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export async function searchCards(params: CardSearchParams): Promise<PaginatedResponse<Card>> {
  const response = await api.get('/cards/search', { params });
  return response.data;
}

export async function autocompleteCards(query: string, limit = 10): Promise<CardAutocompleteResult[]> {
  const response = await api.get('/cards/autocomplete', { params: { q: query, limit } });
  return response.data.data;
}

export async function getCard(id: string): Promise<Card> {
  const response = await api.get(`/cards/${id}`);
  return response.data.data;
}

export async function getCardPrintings(name: string): Promise<Card[]> {
  const response = await api.get('/cards/printings', { params: { name } });
  return response.data.data;
}

export async function getSets(): Promise<Array<{ setCode: string; setName: string }>> {
  const response = await api.get('/cards/sets');
  return response.data.data;
}

export function getCardImageUrl(scryfallId: string | null, size: 'small' | 'normal' | 'large' = 'normal'): string {
  if (!scryfallId) return '/placeholder-card.png';
  const dir1 = scryfallId.charAt(0);
  const dir2 = scryfallId.charAt(1);
  return `https://cards.scryfall.io/${size}/front/${dir1}/${dir2}/${scryfallId}.jpg`;
}
