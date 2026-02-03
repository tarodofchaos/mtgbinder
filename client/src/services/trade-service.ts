import { TradeSession, TradeMatchResult, TradeMessage } from '@mtg-binder/shared';
import { api } from './api';

export async function createTradeSession(): Promise<TradeSession> {
  const response = await api.post('/trade/session');
  return response.data.data;
}

export async function getActiveSessions(): Promise<TradeSession[]> {
  const response = await api.get('/trade/session');
  return response.data.data;
}

export async function joinTradeSession(code: string): Promise<TradeSession> {
  const response = await api.post(`/trade/${code}/join`);
  return response.data.data;
}

export async function getTradeMatches(code: string): Promise<TradeMatchResult> {
  const response = await api.get(`/trade/${code}/matches`);
  return response.data.data;
}

export async function completeTradeSession(code: string): Promise<TradeSession> {
  const response = await api.post(`/trade/${code}/complete`);
  return response.data.data;
}

export async function deleteTradeSession(code: string): Promise<void> {
  await api.delete(`/trade/${code}`);
}

export interface TradeHistoryParams {
  startDate?: string;
  endDate?: string;
  sort?: 'asc' | 'desc';
}

export async function getTradeHistory(params?: TradeHistoryParams): Promise<TradeSession[]> {
  const response = await api.get('/trade/history', { params });
  return response.data.data;
}

export async function getTradeHistoryDetail(id: string): Promise<TradeSession> {
  const response = await api.get(`/trade/history/${id}`);
  return response.data.data;
}

export async function getTradeMessages(code: string, limit = 50): Promise<TradeMessage[]> {
  const response = await api.get(`/trade/${code}/messages`, {
    params: { limit },
  });
  return response.data.data;
}
