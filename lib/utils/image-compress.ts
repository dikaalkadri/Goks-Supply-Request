/**
 * Client-side image compression using Canvas API + browser-image-compression
 *
 * Targets (post-compression):
 *   - Condition photos : max 0.5 MB, max 1024px
 *   - Receipts         : max 0.8 MB, max 1280px
 *
 * All images are converted to WebP where supported; falls back gracefully.
 */
import imageCompression from 'browser-image-compression';

// Web Workers may be blocked in some restricted/private browsers (Samsung Internet, UC Browser)
const supportsWebWorker = typeof Worker !== 'undefined';

export async function compressConditionPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1024,
    initialQuality: 0.75,
    alwaysKeepResolution: false,
    useWebWorker: supportsWebWorker,
    fileType: 'image/webp',
  });
}

export async function compressReceipt(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1280,
    initialQuality: 0.8,
    alwaysKeepResolution: false,
    useWebWorker: supportsWebWorker,
    fileType: 'image/webp',
  });
}

/**
 * Validates an image file before upload.
 * Accepts MIME types from native camera apps on Android that may return empty
 * strings, 'application/octet-stream', 'image/heic', or 'image/heif'.
 * Falls back to file extension check when MIME type is missing or unknown.
 */
export function validateImageFile(file: File): string | null {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

  const mimeType = file.type?.toLowerCase() ?? '';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  // If MIME is known and not allowed → reject
  if (mimeType && mimeType !== 'application/octet-stream' && !allowedMimeTypes.includes(mimeType)) {
    return 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.';
  }

  // If MIME is empty or octet-stream, fall back to extension check
  if (!mimeType || mimeType === 'application/octet-stream') {
    if (!allowedExtensions.includes(ext)) {
      return 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.';
    }
  }

  const maxSize = 20 * 1024 * 1024; // 20 MB raw limit before compression
  if (file.size > maxSize) {
    return 'Ukuran file terlalu besar. Maksimal 20MB sebelum kompresi.';
  }

  return null;
}
