import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface ImageProcessResult {
  success: boolean;
  url: string;
  format: string;
  size: number;
  error?: string;
  source: 'cloud' | 'optimized_base64' | 'direct_url';
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/bmp',
];

const MAX_INPUT_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB max file input

/**
 * Validates whether the given file is an acceptable image format and size
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected. Please choose an image file.' };
  }

  // Check MIME or extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'bmp'];
  const hasValidExt = extension && validExtensions.includes(extension);
  const hasValidMime = ACCEPTED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || extension || 'unknown'}). Please upload a JPG, JPEG, PNG, WebP, or SVG image.`,
    };
  }

  if (file.size > MAX_INPUT_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `The selected image is too large (${sizeMb}MB). Maximum allowed upload size is 15MB.`,
    };
  }

  return { valid: true };
}

/**
 * Resizes and compresses an image file to optimal dimensions (max 1024x1024)
 * and formats it as high-efficiency WebP/JPEG blob and base64.
 */
export async function optimizeImageFile(
  file: File,
  maxDimension: number = 1024,
  quality: number = 0.85
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  // SVGs don't need rasterization/compression
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const text = await file.text();
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(text)}`;
    return {
      blob: file,
      dataUrl,
      width: 500,
      height: 500,
    };
  }

  return new Promise((resolve) => {
    // Overall safety timeout (4 seconds) to prevent any infinite "Processing" state
    const timeoutId = setTimeout(() => {
      console.warn('Image optimization timed out. Falling back to direct file representation.');
      fallbackToOriginal();
    }, 4000);

    const fallbackToOriginal = () => {
      clearTimeout(timeoutId);
      const fallbackReader = new FileReader();
      fallbackReader.onload = (e) => {
        resolve({
          blob: file,
          dataUrl: (e.target?.result as string) || '',
          width: 800,
          height: 800
        });
      };
      fallbackReader.onerror = () => {
        resolve({
          blob: file,
          dataUrl: '',
          width: 800,
          height: 800
        });
      };
      fallbackReader.readAsDataURL(file);
    };

    try {
      const reader = new FileReader();
      reader.onerror = () => {
        clearTimeout(timeoutId);
        fallbackToOriginal();
      };
      reader.onload = (event) => {
        try {
          const img = new Image();
          img.onerror = () => {
            clearTimeout(timeoutId);
            fallbackToOriginal();
          };
          img.onload = () => {
            try {
              clearTimeout(timeoutId);
              let width = img.naturalWidth || img.width;
              let height = img.naturalHeight || img.height;

              if (width <= 0 || height <= 0) {
                width = 800;
                height = 800;
              }

              // Scale down if exceeds max dimension while preserving aspect ratio
              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = Math.round((height * maxDimension) / width);
                  width = maxDimension;
                } else {
                  width = Math.round((width * maxDimension) / height);
                  height = maxDimension;
                }
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                fallbackToOriginal();
                return;
              }

              // High quality smoothing
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);

              // Try webp first, fall back to jpeg
              let outputType = 'image/webp';
              let dataUrl = canvas.toDataURL(outputType, quality);
              if (!dataUrl.startsWith('data:image/webp')) {
                outputType = 'image/jpeg';
                dataUrl = canvas.toDataURL(outputType, quality);
              }

              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    // Fallback blob from base64
                    try {
                      const byteString = atob(dataUrl.split(',')[1]);
                      const ab = new ArrayBuffer(byteString.length);
                      const ia = new Uint8Array(ab);
                      for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                      }
                      const fallbackBlob = new Blob([ab], { type: outputType });
                      resolve({ blob: fallbackBlob, dataUrl, width, height });
                    } catch (err) {
                      fallbackToOriginal();
                    }
                  } else {
                    resolve({ blob, dataUrl, width, height });
                  }
                },
                outputType,
                quality
              );
            } catch (err) {
              fallbackToOriginal();
            }
          };
          img.src = event.target?.result as string;
        } catch (err) {
          clearTimeout(timeoutId);
          fallbackToOriginal();
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      clearTimeout(timeoutId);
      fallbackToOriginal();
    }
  });
}

/**
 * High-reliability upload handler:
 * Validates, compresses, attempts Firebase Cloud Storage upload,
 * and seamlessly uses optimized Base64 fallback if storage bucket or network is unavailable.
 */
export async function processAndUploadProductImage(
  file: File,
  businessId: string
): Promise<ImageProcessResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return {
      success: false,
      url: '',
      format: '',
      size: file.size,
      error: validation.error,
      source: 'cloud',
    };
  }

  try {
    // 1. Optimize and compress on client
    const { blob, dataUrl } = await optimizeImageFile(file, 1024, 0.85);

    // 2. Attempt Firebase Storage upload with a strict timeout race
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `businesses/${businessId || 'default-biz'}/products/${Date.now()}_${cleanFileName}`;
    
    try {
      if (storage) {
        const uploadTask = (async () => {
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, blob);
          return await getDownloadURL(storageRef);
        })();

        // 3.5-second timeout to fall back safely instead of hanging in the iframe
        const timeoutTask = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Firebase Storage upload timed out after 3.5 seconds')), 3500)
        );

        const downloadUrl = await Promise.race([uploadTask, timeoutTask]);

        return {
          success: true,
          url: downloadUrl,
          format: blob.type,
          size: blob.size,
          source: 'cloud',
        };
      }
    } catch (storageErr) {
      console.warn('Firebase Cloud Storage unavailable, timed out, or offline. Using optimized high-fidelity local storage fallback:', storageErr);
    }

    // 3. Fallback to lightweight optimized Base64 dataUrl (~30KB-80KB)
    return {
      success: true,
      url: dataUrl,
      format: blob.type || 'image/webp',
      size: dataUrl.length,
      source: 'optimized_base64',
    };
  } catch (err: any) {
    return {
      success: false,
      url: '',
      format: '',
      size: file.size,
      error: err?.message || 'Failed to process product image. Please try another image.',
      source: 'cloud',
    };
  }
}
