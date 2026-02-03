import { parseDecklist } from './decklist-parser';

describe('parseDecklist', () => {
  it('should parse format: "4 Lightning Bolt"', () => {
    const input = '4 Lightning Bolt';
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      quantity: 4,
      cardName: 'Lightning Bolt',
    });
    expect(result.errors).toHaveLength(0);
  });

  it('should parse format: "4x Card Name"', () => {
    const input = '4x Counterspell';
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      quantity: 4,
      cardName: 'Counterspell',
    });
  });

  it('should parse format: "Card Name x4"', () => {
    const input = 'Brainstorm x4';
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      quantity: 4,
      cardName: 'Brainstorm',
    });
  });

  it('should parse format with set code: "4 Lightning Bolt (M10)"', () => {
    const input = '4 Lightning Bolt (M10)';
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      quantity: 4,
      cardName: 'Lightning Bolt',
      setCode: 'M10',
    });
  });

  it('should parse format with set code: "4x Card Name (ABC)"', () => {
    const input = '4x Brainstorm (ICE)';
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      quantity: 4,
      cardName: 'Brainstorm',
      setCode: 'ICE',
    });
  });

  it('should parse format with set code: "Card Name (SET) x4"', () => {
    const input = 'Ponder (M12) x3';
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      quantity: 3,
      cardName: 'Ponder',
      setCode: 'M12',
    });
  });

  it('should handle multiple lines', () => {
    const input = `4 Lightning Bolt
3x Counterspell
Brainstorm x2`;
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].cardName).toBe('Lightning Bolt');
    expect(result.entries[1].cardName).toBe('Counterspell');
    expect(result.entries[2].cardName).toBe('Brainstorm');
  });

  it('should skip empty lines', () => {
    const input = `4 Lightning Bolt

3 Counterspell`;
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(2);
  });

  it('should skip sideboard markers', () => {
    const input = `4 Lightning Bolt
Sideboard:
3 Red Elemental Blast
SB:
2 Pyroblast`;
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].cardName).toBe('Lightning Bolt');
    expect(result.entries[1].cardName).toBe('Red Elemental Blast');
    expect(result.entries[2].cardName).toBe('Pyroblast');
  });

  it('should handle card names with special characters', () => {
    const input = `4 Jace, the Mind Sculptor
1 Teferi's Protection`;
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].cardName).toBe('Jace, the Mind Sculptor');
    expect(result.entries[1].cardName).toBe("Teferi's Protection");
  });

  it('should handle card names with numbers', () => {
    const input = '1 Channel the Suns';
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].cardName).toBe('Channel the Suns');
  });

  it('should record errors for unparseable lines', () => {
    const input = `4 Lightning Bolt
This is not a valid line
3 Counterspell`;
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Line 2');
  });

  it('should handle mixed formats in one decklist', () => {
    const input = `4 Lightning Bolt
3x Counterspell (ICE)
Brainstorm x2
1 Ponder (M12)`;
    const result = parseDecklist(input);

    expect(result.entries).toHaveLength(4);
    expect(result.entries[0]).toEqual({ quantity: 4, cardName: 'Lightning Bolt' });
    expect(result.entries[1]).toEqual({ quantity: 3, cardName: 'Counterspell', setCode: 'ICE' });
    expect(result.entries[2]).toEqual({ quantity: 2, cardName: 'Brainstorm' });
    expect(result.entries[3]).toEqual({ quantity: 1, cardName: 'Ponder', setCode: 'M12' });
  });

  it('should normalize set codes to uppercase', () => {
    const input = '4 Lightning Bolt (m10)';
    const result = parseDecklist(input);

    expect(result.entries[0].setCode).toBe('M10');
  });
});
