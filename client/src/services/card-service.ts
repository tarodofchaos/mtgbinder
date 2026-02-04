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

// Map our language codes to Scryfall's codes
const SCRYFALL_LANG_MAP: Record<string, string> = {
  EN: 'en',
  ES: 'es',
  DE: 'de',
  FR: 'fr',
  IT: 'it',
  PT: 'pt',
  JA: 'ja',
  KO: 'ko',
  RU: 'ru',
  ZH: 'zhs', // Simplified Chinese
};

export interface CardImageOptions {
  scryfallId?: string | null;
  setCode?: string;
  collectorNumber?: string;
  language?: string;
  size?: 'small' | 'normal' | 'large';
}

export function getCardImageUrl(
  scryfallIdOrOptions: string | null | CardImageOptions,
  size: 'small' | 'normal' | 'large' = 'normal'
): string {
  // Handle legacy call signature: getCardImageUrl(scryfallId, size)
  if (typeof scryfallIdOrOptions === 'string' || scryfallIdOrOptions === null) {
    const scryfallId = scryfallIdOrOptions;
    if (!scryfallId) return '/placeholder-card.png';
    const dir1 = scryfallId.charAt(0);
    const dir2 = scryfallId.charAt(1);
    return `https://cards.scryfall.io/${size}/front/${dir1}/${dir2}/${scryfallId}.jpg`;
  }

  // Handle new options object signature
  const options = scryfallIdOrOptions;
  const { scryfallId, setCode, collectorNumber, language } = options;
  const imageSize = options.size || size;

  // If we have set code, collector number, and a non-English language, use Scryfall API
  const scryfallLang = language ? SCRYFALL_LANG_MAP[language] : 'en';
  if (setCode && collectorNumber && scryfallLang && scryfallLang !== 'en') {
    // Use Scryfall's API endpoint for language-specific images
    return `https://api.scryfall.com/cards/${setCode.toLowerCase()}/${collectorNumber}/${scryfallLang}?format=image&version=${imageSize}`;
  }

  // Fall back to direct image URL with scryfallId
  if (!scryfallId) return '/placeholder-card.png';
  const dir1 = scryfallId.charAt(0);
  const dir2 = scryfallId.charAt(1);
  return `https://cards.scryfall.io/${imageSize}/front/${dir1}/${dir2}/${scryfallId}.jpg`;
}
