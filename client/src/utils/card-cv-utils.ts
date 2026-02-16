import cv from '@techstark/opencv-js';

export interface ProcessingResult {
  status: 'success' | 'no_card_found' | 'error';
  imageData?: string;
  error?: string;
}

/**
 * Processes an image to find a card, rotate it, and enhance it for OCR.
 */
export async function processCardImage(imageSrc: string): Promise<ProcessingResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const mat = cv.imread(img);
        const gray = new cv.Mat();
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

        // Better preprocessing for silhouette detection
        // Adaptive threshold finds the edges of the card even in variable lighting
        const thresh = new cv.Mat();
        cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

        // Close small gaps in the border using morphology
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
        const closed = new cv.Mat();
        cv.morphologyEx(thresh, closed, cv.MORPH_CLOSE, kernel);

        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        // RETR_EXTERNAL to get the outermost boundary
        cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let cardContour: cv.Mat | null = null;
        let maxArea = 0;
        const targetRatio = 63 / 88; // 0.7159
        const ratioTolerance = 0.15;

        for (let i = 0; i < contours.size(); ++i) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          
          // Minimum area check (at least 5% of the image)
          if (area > (mat.cols * mat.rows * 0.05)) {
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
            
            if (approx.rows === 4) {
              // Calculate side lengths for a more robust ratio check under perspective
              const p1 = { x: approx.data32S[0], y: approx.data32S[1] };
              const p2 = { x: approx.data32S[2], y: approx.data32S[3] };
              const p3 = { x: approx.data32S[4], y: approx.data32S[5] };
              
              const s1 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
              const s2 = Math.hypot(p2.x - p3.x, p2.y - p3.y);
              const ratio = Math.min(s1, s2) / Math.max(s1, s2);
              
              if (Math.abs(ratio - targetRatio) < ratioTolerance && area > maxArea) {
                if (cardContour) cardContour.delete();
                cardContour = approx;
                maxArea = area;
              } else {
                approx.delete();
              }
            } else {
              approx.delete();
            }
          }
        }

        if (!cardContour) {
          // If RETR_EXTERNAL failed, try RETR_LIST as fallback to find nested card
          cv.findContours(closed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
          for (let i = 0; i < contours.size(); ++i) {
            const cnt = contours.get(i);
            const area = cv.contourArea(cnt);
            if (area > (mat.cols * mat.rows * 0.05)) {
              const peri = cv.arcLength(cnt, true);
              const approx = new cv.Mat();
              cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
              if (approx.rows === 4) {
                const p1 = { x: approx.data32S[0], y: approx.data32S[1] };
                const p2 = { x: approx.data32S[2], y: approx.data32S[3] };
                const p3 = { x: approx.data32S[4], y: approx.data32S[5] };
                const s1 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                const s2 = Math.hypot(p2.x - p3.x, p2.y - p3.y);
                const ratio = Math.min(s1, s2) / Math.max(s1, s2);
                if (Math.abs(ratio - targetRatio) < ratioTolerance && area > maxArea) {
                  if (cardContour) cardContour.delete();
                  cardContour = approx;
                  maxArea = area;
                } else {
                  approx.delete();
                }
              } else {
                approx.delete();
              }
            }
          }
        }

        if (!cardContour) {
          gray.delete(); thresh.delete(); kernel.delete(); closed.delete();
          contours.delete(); hierarchy.delete(); mat.delete();
          resolve({ status: 'no_card_found' });
          return;
        }

        // Perspective Transform - Map to standard 630x880 resolution
        const transformed = warpPerspective(mat, cardContour, 630, 880);

        const canvas = document.createElement('canvas');
        cv.imshow(canvas, transformed);
        const resultData = canvas.toDataURL('image/png');

        gray.delete(); thresh.delete(); kernel.delete(); closed.delete();
        contours.delete(); hierarchy.delete();
        mat.delete(); transformed.delete(); cardContour.delete();

        resolve({ status: 'success', imageData: resultData });
      } catch (err) {
        console.error('OpenCV Error:', err);
        resolve({ status: 'error', error: String(err) });
      }
    };
    img.onerror = () => resolve({ status: 'error', error: 'Failed to load image' });
    img.src = imageSrc;
  });
}

function warpPerspective(src: cv.Mat, contour: cv.Mat, targetW: number, targetH: number): cv.Mat {
  const pts = [];
  for (let i = 0; i < 4; i++) {
    pts.push({ x: contour.data32S[i * 2], y: contour.data32S[i * 2 + 1] });
  }

  // Robust corner sorting:
  // 1. Sort by Y coordinate
  pts.sort((a, b) => a.y - b.y);
  
  // 2. Take top two and bottom two
  const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
  
  const tl = top[0];
  const tr = top[1];
  const br = bottom[1];
  const bl = bottom[0];

  // Calculate dimensions of the detected quad
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
  const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);

  const avgWidth = (widthTop + widthBottom) / 2;
  const avgHeight = (heightLeft + heightRight) / 2;

  // We always want to map to a portrait 630x880 result.
  // If the detected quad is wider than it is tall, we map to landscape dimensions
  // and then rotate.
  const isLandscape = avgWidth > avgHeight;
  const finalW = isLandscape ? targetH : targetW;
  const finalH = isLandscape ? targetW : targetH;

  const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y,
    tr.x, tr.y,
    br.x, br.y,
    bl.x, bl.y
  ]);

  const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    finalW, 0,
    finalW, finalH,
    0, finalH
  ]);

  const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(finalW, finalH));

  // If it was detected as landscape, rotate to portrait
  if (isLandscape) {
    const rotated = new cv.Mat();
    cv.rotate(dst, rotated, cv.ROTATE_90_CLOCKWISE);
    dst.delete();
    M.delete(); srcCoords.delete(); dstCoords.delete();
    return rotated;
  }

  M.delete(); srcCoords.delete(); dstCoords.delete();
  return dst;
}

/**
 * Specifically crops the bottom-left area of a standard MTG card.
 */
export function cropToCollectorInfo(mat: cv.Mat): cv.Mat {
  const width = mat.cols;
  const height = mat.rows;
  const cropHeight = Math.floor(height * 0.15);
  const rect = new cv.Rect(0, height - cropHeight, width, cropHeight);
  return mat.roi(rect);
}
