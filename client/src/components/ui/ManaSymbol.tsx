import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C' | 'X' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15';

interface ManaSymbolProps {
  color: string;
  size?: number;
  sx?: SxProps<Theme>;
}

export function ManaSymbol({ color, size = 20, sx }: ManaSymbolProps) {
  // Use Scryfall's SVG symbols
  const symbolUrl = `https://svgs.scryfall.io/card-symbols/${color.toUpperCase()}.svg`;

  return (
    <Box
      component="img"
      src={symbolUrl}
      alt={color}
      sx={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        ...sx,
      }}
      referrerPolicy="no-referrer"
    />
  );
}
