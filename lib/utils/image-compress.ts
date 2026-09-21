/**
 * Client-side image compression using Canvas API + browser-image-compression
 * Target: max 1280px for condition photos, max 1600px for receipts
 */
import imageCompression from 'browser-image-compression';

export async function compressConditionPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/webp',
  });
}

export async function compressReceipt(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 1600,
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
