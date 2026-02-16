import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Alert,
  Typography,
  CircularProgress,
  LinearProgress,
  TextField,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Image as ImageIcon,
  Search as ParseIcon,
  Delete as DeleteIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
// import { createWorker } from 'tesseract.js';
import { processCardImage } from '../../utils/card-cv-utils';

interface PhotoImportTabProps {
  onParse: (text: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  uploadArea: {
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
  imagePreview: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'contain',
    borderRadius: 1,
    mb: 2,
    border: '1px solid',
    borderColor: 'divider',
  },
  progressContainer: {
    width: '100%',
    mt: 2,
    mb: 2,
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1,
  },
  previewSection: {
    position: 'relative',
    display: 'inline-block',
    width: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    bgcolor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 1)',
    },
  },
  modeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 2,
    p: 1.5,
    bgcolor: 'action.hover',
    borderRadius: 1,
  },
};

export function PhotoImportTab({ onParse, isLoading, error }: PhotoImportTabProps) {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [collectorMode, setCollectorMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        handleProcessImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessImage = async (imageSrc: string) => {
    setIsProcessing(true);
    setOcrProgress(0);
    setOcrStatus(t('import.detectingCard', 'Detecting card and aligning...'));

    try {
      // Step 1 & 2: CV Pro Workflow (Boundary Detection & Rotation)
      const cvResult = await processCardImage(imageSrc);
      
      if (cvResult.status === 'success' && cvResult.imageData) {
        setProcessedImage(cvResult.imageData);
        setOcrStatus(t('import.cardDetected', 'Card detected and aligned.'));
      } else {
        setOcrStatus(t('import.noCardDetected', 'No card detected, using original image...'));
        setProcessedImage(null);
      }

      // Skip OCR for this step as requested by user to verify alignment first
      setIsProcessing(false);
    } catch (err) {
      console.error('OCR Error:', err);
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
      setOcrStatus('');
    }
  };

  const handleParse = () => {
    if (ocrText.trim()) {
      onParse(ocrText);
    }
  };

  const handleClear = () => {
    setImage(null);
    setProcessedImage(null);
    setOcrText('');
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.modeToggle}>
        <FormControlLabel
          control={
            <Switch
              checked={collectorMode}
              onChange={(e) => setCollectorMode(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" fontWeight={500}>
                {t('import.collectorMode', 'Collector Mode (Set & Number)')}
              </Typography>
              <Tooltip title={t('import.collectorModeHelp', 'Optimizes for reading the set code and collector number at the bottom of the card for 100% accuracy.')}>
                <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Box>
          }
        />
      </Box>

      {!image ? (
        <Box
          sx={styles.uploadArea}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {t('import.photoUploadTitle', 'Upload or Take Photo')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('import.photoUploadDesc', 'Capture a photo of your card(s) to automatically recognize their names.')}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<CameraIcon />}
            sx={{ mt: 2 }}
            component="span"
          >
            {t('import.takePhoto', 'Take Photo')}
          </Button>
        </Box>
      ) : (
        <Box>
          <Box sx={styles.previewSection}>
            <img 
              src={processedImage || image} 
              alt="Preview" 
              style={styles.imagePreview as any} 
            />
            <Button
              variant="contained"
              color="error"
              size="small"
              sx={styles.deleteButton}
              onClick={handleClear}
              disabled={isProcessing || isLoading}
            >
              <DeleteIcon />
            </Button>
          </Box>

          {isProcessing && (
            <Box sx={styles.progressContainer}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {ocrStatus} ({Math.round(ocrProgress)}%)
              </Typography>
              <LinearProgress variant="determinate" value={ocrProgress} />
            </Box>
          )}

          {!isProcessing && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                {t('import.recognizedText', 'Recognized Text (Review and Edit):')}
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder={t('import.ocrPlaceholder', 'No text recognized. Try another photo or enter manually.')}
                disabled={isLoading}
                sx={{ mb: 2 }}
                helperText={collectorMode ? t('import.collectorFormatHint', 'Format: SET NUMBER (e.g., MH2 267)') : ''}
              />
            </>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      <Box sx={styles.buttonGroup}>
        <Button
          variant="contained"
          startIcon={(isLoading || isProcessing) ? <CircularProgress size={20} /> : <ParseIcon />}
          onClick={handleParse}
          disabled={!ocrText.trim() || isLoading || isProcessing}
        >
          {(isLoading || isProcessing) ? t('common.loading', 'Loading...') : t('import.parsePhotoResults', 'Add to Import')}
        </Button>
      </Box>
    </Box>
  );
}
