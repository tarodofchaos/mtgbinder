import { CardCondition } from '@prisma/client';

export const CONDITION_RANK: Record<CardCondition, number> = {
  M: 0,
  NM: 1,
  LP: 2,
  MP: 3,
  HP: 4,
  DMG: 5,
};

export function isConditionAcceptable(
  cardCondition: CardCondition,
  minCondition: CardCondition | null
): boolean {
  if (!minCondition) return true;
  return CONDITION_RANK[cardCondition] <= CONDITION_RANK[minCondition];
}

export function getConditionLabel(condition: CardCondition): string {
  const labels: Record<CardCondition, string> = {
    M: 'Mint',
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DMG: 'Damaged',
  };
  return labels[condition];
}
