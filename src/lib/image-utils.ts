/**
 * Image Processing Utilities
 * Handles compression, EXIF extraction, and thumbnail generation
 */

import sharp from 'sharp';
import exifr from 'exifr';

export interface ImageMetadata {
  latitude?: number;
  longitude?: number;
  timestamp?: Date;
  device?: string;
  width?: number;
  height?: number;
  make?: string;
  model?: string;
}

/**
 * Extract EXIF metadata from image buffer
 */
export async function extractExifData(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const exif = await exifr.parse(buffer, {
      gps: true,
      exif: true,
      ifd0: true,
      makerNote: false, // Skip maker notes for performance
    } as unknown as Parameters<typeof exifr.parse>[1]);

    if (!exif) {
      return {};
    }

    return {
      latitude: exif.latitude,
      longitude: exif.longitude,
      timestamp: exif.DateTimeOriginal || exif.DateTime || exif.CreateDate,
      device: exif.Model || exif.Make,
      make: exif.Make,
      model: exif.Model,
    };
  } catch (error) {
    console.error('[Image Utils] Error extracting EXIF:', error);
    return {};
  }
}

/**
 * Compress image to reasonable file size
 * Target: ~2MB max, 1920px max dimension
 */
export async function compressImage(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Calculate dimensions (maintain aspect ratio)
    const maxDimension = 1920;
    let width = metadata.width || maxDimension;
    let height = metadata.height || maxDimension;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
    }

    // Compress image
    const compressed = await image
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();

    console.log(`[Image Utils] Compressed from ${buffer.length} to ${compressed.length} bytes`);
    return compressed;
  } catch (error) {
    console.error('[Image Utils] Error compressing image:', error);
    // Return original if compression fails
    return buffer;
  }
}

/**
 * Generate thumbnail (200px max dimension)
 */
export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(200, 200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();
  } catch (error) {
    console.error('[Image Utils] Error generating thumbnail:', error);
    throw error;
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    console.error('[Image Utils] Error getting dimensions:', error);
    return { width: 0, height: 0 };
  }
}

/**
 * Validate image file
 */
export function isValidImageType(mimetype: string): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  return validTypes.includes(mimetype.toLowerCase());
}

/**
 * Validate image size (max 20MB original)
 */
export function isValidImageSize(size: number): boolean {
  const maxSize = 20 * 1024 * 1024; // 20MB
  return size <= maxSize;
}

