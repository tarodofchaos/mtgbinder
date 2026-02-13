// Card condition enum
export enum CardCondition {
  MINT = 'M',
  NEAR_MINT = 'NM',
  LIGHTLY_PLAYED = 'LP',
  MODERATELY_PLAYED = 'MP',
  HEAVILY_PLAYED = 'HP',
  DAMAGED = 'DMG',
}

// Wishlist priority enum
export enum WishlistPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Trade session status enum
export enum TradeSessionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

// Card types
export interface Card {
  id: string;
  name: string;
  nameEs: string | null;
  setCode: string;
  setName: string;
  rarity: string;
  colors: string[];
  manaCost: string | null;
  manaValue: number;
  typeLine: string;
  oracleText: string | null;
  scryfallId: string | null;
  collectorNumber: string;
  priceEur: number | null;
  priceEurFoil: number | null;
  priceUsd: number | null;
  priceUsdFoil: number | null;
  imageUri: string | null;
}

// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  shareCode: string;
  avatarId: string | null;
  isPublic: boolean;
  createdAt: Date;
}

export interface UserPublic {
  id: string;
  displayName: string;
  shareCode: string;
  avatarId: string | null;
}

// Collection types
export interface CollectionItem {
  id: string;
  userId: string;
  cardId: string;
  quantity: number;
  foilQuantity: number;
  condition: CardCondition;
  language: string;
  isAlter: boolean;
  photoUrl: string | null;
  forTrade: number;
  tradePrice: number | null;
  card?: Card;
}

export interface CollectionItemInput {
  cardId: string;
  quantity: number;
  foilQuantity?: number;
  condition?: CardCondition;
  language?: string;
  isAlter?: boolean;
  photoUrl?: string | null;
  forTrade?: number;
  tradePrice?: number | null;
}

export interface CollectionStats {
  totalCards: number;
  uniqueCards: number;
  totalValue: number;
  totalValueFoil: number;
  forTradeCount: number;
}

// Wishlist types
export interface WishlistItem {
  id: string;
  userId: string;
  cardId: string;
  quantity: number;
  priority: WishlistPriority;
  maxPrice: number | null;
  minCondition: CardCondition | null;
  foilOnly: boolean;
  card?: Card;
}

export interface WishlistItemInput {
  cardId: string;
  quantity?: number;
  priority?: WishlistPriority;
  maxPrice?: number | null;
  minCondition?: CardCondition | null;
  foilOnly?: boolean;
}

// Trade types
export interface TradeSession {
  id: string;
  sessionCode: string;
  initiatorId: string;
  joinerId: string | null;
  status: TradeSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  initiator?: UserPublic;
  joiner?: UserPublic;
  matchCount?: number; // For history view
  matchesJson?: unknown; // Cached match results
}

export interface TradeMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  sender?: UserPublic;
}

export interface TradeMatch {
  card: Card;
  offererUserId: string;
  receiverUserId: string;
  availableQuantity: number;
  condition: CardCondition;
  language: string;
  isAlter: boolean;
  photoUrl: string | null;
  isFoil: boolean;
  priority: WishlistPriority | null;
  priceEur: number | null;
  tradePrice: number | null;
  isMatch: boolean;
}

export interface TradeMatchResult {
  session: TradeSession;
  userAOffers: TradeMatch[];
  userBOffers: TradeMatch[];
  userATotalValue: number;
  userBTotalValue: number;
  userASelectedJson?: Record<string, number>;
  userBSelectedJson?: Record<string, number>;
}

// Auth types
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  avatarId?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Card search types
export interface CardSearchParams {
  query?: string;
  setCode?: string;
  rarity?: string;
  colors?: string[];
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface CardAutocompleteResult {
  id: string;
  name: string;
  nameEs: string | null;
  setCode: string;
  setName: string;
  scryfallId: string | null;
}

// Import types
export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// Set completion types
export interface SetCompletionSummary {
  setCode: string;
  setName: string;
  ownedCount: number;
  totalCount: number;
  completionPercentage: number;
}

export interface SetCompletionDetail {
  setCode: string;
  setName: string;
  ownedCount: number;
  totalCount: number;
  completionPercentage: number;
  missingCards: Card[];
}

// Notification types
export enum NotificationType {
  PRICE_ALERT = 'PRICE_ALERT',
  TRADE_MATCH = 'TRADE_MATCH',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: Date;
  cardId: string | null;
  card?: Card;
}

// Helper to get Scryfall image URL
export function getScryfallImageUrl(
  scryfallId: string | null,
  size: 'small' | 'normal' | 'large' | 'png' = 'normal'
): string | null {
  if (!scryfallId) return null;
  const dir1 = scryfallId.charAt(0);
  const dir2 = scryfallId.charAt(1);
  return `https://cards.scryfall.io/${size}/front/${dir1}/${dir2}/${scryfallId}.jpg`;
}

// Generate Cardmarket search URL for a card
// Uses search instead of direct URL because:
// - Set names don't always match between MTGJSON and Cardmarket
// - Digital-only sets (Alchemy, Arena) don't exist on Cardmarket
// - Search shows all prints, which is helpful for collectors
export function getCardmarketUrl(card: { name: string; setName: string }): string {
  // Clean up the card name for search
  // Handle split cards: "Fire // Ice" -> "Fire Ice"
  const searchName = card.name
    .replace(/\s*\/\/\s*/g, ' ')
    .trim();

  // URL encode the search term
  const encodedName = encodeURIComponent(searchName);

  return `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodedName}&mode=gallery`;
}

// Condition ranking for comparison
export const CONDITION_RANK: Record<CardCondition, number> = {
  [CardCondition.MINT]: 0,
  [CardCondition.NEAR_MINT]: 1,
  [CardCondition.LIGHTLY_PLAYED]: 2,
  [CardCondition.MODERATELY_PLAYED]: 3,
  [CardCondition.HEAVILY_PLAYED]: 4,
  [CardCondition.DAMAGED]: 5,
};

export function isConditionAcceptable(
  cardCondition: CardCondition,
  minCondition: CardCondition | null
): boolean {
  if (!minCondition) return true;
  return CONDITION_RANK[cardCondition] <= CONDITION_RANK[minCondition];
}
