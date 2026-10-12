/**
 * Client-side image compression using Canvas API + browser-image-compression
 *
 * Targets (post-compression):
 *   - Condition photos : max 0.5 MB, max 1024px
 *   - Receipts         : max 0.8 MB, max 1280px
 *
 * All images are converted to WebP for maximum byte savings.
 */
import imageCompression from 'browser-image-compression';

export async function compressConditionPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1024,
    initialQuality: 0.75,
    alwaysKeepResolution: false,
    useWebWorker: true,
    fileType: 'image/webp',
  });
}

export async function compressReceipt(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1280,
    initialQuality: 0.8,
    alwaysKeepResolution: false,
    useWebWorker: true,
    fileType: 'image/webp',
  });
}

export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau WebP.';
  }
  const maxSize = 20 * 1024 * 1024; // 20MB raw limit before compression
  if (file.size > maxSize) {
    return 'Ukuran file terlalu besar. Maksimal 20MB sebelum kompresi.';
  }
  return null;
}
