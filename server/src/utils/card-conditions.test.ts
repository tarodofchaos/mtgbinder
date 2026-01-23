import { isConditionAcceptable, getConditionLabel, CONDITION_RANK } from './card-conditions';

describe('card-conditions', () => {
  describe('CONDITION_RANK', () => {
    it('should rank Mint as best condition (lowest number)', () => {
      expect(CONDITION_RANK.M).toBe(0);
    });

    it('should rank Damaged as worst condition (highest number)', () => {
      expect(CONDITION_RANK.DMG).toBe(5);
    });

    it('should have correct ordering from best to worst', () => {
      expect(CONDITION_RANK.M).toBeLessThan(CONDITION_RANK.NM);
      expect(CONDITION_RANK.NM).toBeLessThan(CONDITION_RANK.LP);
      expect(CONDITION_RANK.LP).toBeLessThan(CONDITION_RANK.MP);
      expect(CONDITION_RANK.MP).toBeLessThan(CONDITION_RANK.HP);
      expect(CONDITION_RANK.HP).toBeLessThan(CONDITION_RANK.DMG);
    });
  });

  describe('isConditionAcceptable', () => {
    it('should accept any condition when minCondition is null', () => {
      expect(isConditionAcceptable('M', null)).toBe(true);
      expect(isConditionAcceptable('NM', null)).toBe(true);
      expect(isConditionAcceptable('DMG', null)).toBe(true);
    });

    it('should accept exact match', () => {
      expect(isConditionAcceptable('NM', 'NM')).toBe(true);
      expect(isConditionAcceptable('LP', 'LP')).toBe(true);
    });

    it('should accept better conditions than minimum', () => {
      expect(isConditionAcceptable('M', 'NM')).toBe(true);
      expect(isConditionAcceptable('NM', 'LP')).toBe(true);
      expect(isConditionAcceptable('M', 'DMG')).toBe(true);
    });

    it('should reject worse conditions than minimum', () => {
      expect(isConditionAcceptable('NM', 'M')).toBe(false);
      expect(isConditionAcceptable('LP', 'NM')).toBe(false);
      expect(isConditionAcceptable('DMG', 'LP')).toBe(false);
    });
  });

  describe('getConditionLabel', () => {
    it('should return full name for each condition code', () => {
      expect(getConditionLabel('M')).toBe('Mint');
      expect(getConditionLabel('NM')).toBe('Near Mint');
      expect(getConditionLabel('LP')).toBe('Lightly Played');
      expect(getConditionLabel('MP')).toBe('Moderately Played');
      expect(getConditionLabel('HP')).toBe('Heavily Played');
      expect(getConditionLabel('DMG')).toBe('Damaged');
    });
  });
});
