import { CollectionItem, UserPublic, WishlistItem } from '@mtg-binder/shared';
import { api } from './api';

export interface PublicBinderResponse {
  user: UserPublic;
  items: CollectionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PublicWishlistResponse {
  user: UserPublic;
  items: WishlistItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PublicBinderParams {
  page?: number;
  pageSize?: number;
  search?: string;
  setCode?: string;
  forTrade?: boolean;
}

export async function getPublicBinder(
  shareCode: string,
  params: PublicBinderParams = {}
): Promise<PublicBinderResponse> {
  const response = await api.get(`/binder/${shareCode}`, { params });
  return response.data.data;
}

export async function getPublicTrades(
  shareCode: string,
  params: Omit<PublicBinderParams, 'forTrade'> = {}
): Promise<PublicBinderResponse> {
  return getPublicBinder(shareCode, { ...params, forTrade: true });
}

export async function getPublicWishlist(
  shareCode: string,
  params: Omit<PublicBinderParams, 'setCode' | 'forTrade'> = {}
): Promise<PublicWishlistResponse> {
  const response = await api.get(`/binder/${shareCode}/wishlist`, { params });
  return response.data.data;
}
