import { ReactNode } from 'react';
import Grid from '@mui/material/Grid';

interface CardGridProps {
  children: ReactNode;
}

export function CardGrid({ children }: CardGridProps) {
  return (
    <Grid container spacing={2}>
      {children}
    </Grid>
  );
}

export function CardGridItem({ children }: { children: ReactNode }) {
  return (
    <Grid
      size={{
        xs: 6,
        sm: 4,
        md: 3,
        lg: 2.4,
        xl: 2,
      }}
    >
      {children}
    </Grid>
  );
}
