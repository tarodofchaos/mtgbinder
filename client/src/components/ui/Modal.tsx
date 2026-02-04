import { ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap: Record<string, 'xs' | 'sm' | 'md' | 'lg' | 'xl'> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'lg',
};

const styles: Record<string, SxProps<Theme>> = {
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    pr: 1,
  },
  closeButton: {
    color: 'text.secondary',
  },
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={sizeMap[size]}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            maxHeight: '90vh',
            minHeight: { xs: '60vh', sm: '50vh' },
          },
        },
      }}
    >
      {title && (
        <DialogTitle>
          <Box sx={styles.titleContainer}>
            {title}
            <IconButton
              onClick={onClose}
              sx={styles.closeButton}
              aria-label="Close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
      )}
      <DialogContent
        dividers={!!title}
        sx={{
          overflowY: 'auto',
          overflowX: 'visible',
          minHeight: { xs: 300, sm: 350 },
          pb: 4,
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
