import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { downloadWishlistCSVTemplate, CSVParseError } from '../../services/import-service';

interface ImportWishlistUploadStepProps {
  onFileSelected: (file: File) => void;
  parseErrors: CSVParseError[];
  isLoading: boolean;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  dropzone: {
    border: '2px dashed',
    borderColor: 'divider',
    borderRadius: 2,
    p: 4,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: 'primary.main',
      bgcolor: 'action.hover',
    },
  },
  dropzoneActive: {
    borderColor: 'primary.main',
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    '& .MuiTypography-root': {
      color: 'inherit',
    },
    '& .MuiSvgIcon-root': {
      color: 'inherit',
    },
  },
  uploadIcon: {
    fontSize: 48,
    color: 'text.secondary',
    mb: 2,
  },
  templateSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    p: 2,
    bgcolor: 'action.hover',
    borderRadius: 1,
  },
  formatInfo: {
    p: 2,
    bgcolor: 'grey.50',
    borderRadius: 1,
  },
  formatList: {
    pl: 3,
    mt: 1,
    '& li': {
      mb: 0.5,
    },
  },
  errorList: {
    maxHeight: 200,
    overflow: 'auto',
  },
};

export function ImportWishlistUploadStep({ onFileSelected, parseErrors, isLoading }: ImportWishlistUploadStepProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadWishlistCSVTemplate();
  };

  return (
    <Box sx={styles.container}>
      {/* Drop zone */}
      <Box
        sx={{
          ...styles.dropzone as object,
          ...(isDragActive ? styles.dropzoneActive as object : {}),
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleDropzoneClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleDropzoneClick()}
        aria-label="Upload wishlist CSV file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={isLoading}
        />
        <UploadIcon sx={styles.uploadIcon} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your wishlist CSV file'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Maximum 1000 cards • 5MB file size limit
        </Typography>
      </Box>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <Alert severity="error" sx={styles.errorList}>
          <Typography variant="subtitle2" gutterBottom>
            CSV parsing errors:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {parseErrors.slice(0, 10).map((error, idx) => (
              <li key={idx}>
                {error.row > 0 ? `Row ${error.row}: ` : ''}
                {error.message}
              </li>
            ))}
            {parseErrors.length > 10 && (
              <li>...and {parseErrors.length - 10} more errors</li>
            )}
          </Box>
        </Alert>
      )}

      {/* Template download */}
      <Box sx={styles.templateSection}>
        <FileIcon color="action" />
        <Typography variant="body2" color="text.secondary">
          Need a template to get started?
        </Typography>
        <Button
          startIcon={<DownloadIcon />}
          onClick={handleDownloadTemplate}
          size="small"
        >
          Download Wishlist CSV Template
        </Button>
      </Box>

      {/* Format info */}
      <Box sx={styles.formatInfo}>
        <Typography variant="subtitle2" gutterBottom>
          CSV Format
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Required columns:
        </Typography>
        <Box component="ul" sx={styles.formatList}>
          <Typography component="li" variant="body2">
            <strong>name</strong> - Card name (required)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Optional columns:
        </Typography>
        <Box component="ul" sx={styles.formatList}>
          <Typography component="li" variant="body2">
            <strong>quantity</strong> - Number of copies wanted (default: 1)
          </Typography>
          <Typography component="li" variant="body2">
            <strong>priority</strong> - LOW, NORMAL, HIGH, URGENT (default: NORMAL)
          </Typography>
          <Typography component="li" variant="body2">
            <strong>maxPrice</strong> - Maximum price in EUR (optional)
          </Typography>
          <Typography component="li" variant="body2">
            <strong>minCondition</strong> - M, NM, LP, MP, HP, DMG (optional)
          </Typography>
          <Typography component="li" variant="body2">
            <strong>foilOnly</strong> - true/false (default: false)
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
