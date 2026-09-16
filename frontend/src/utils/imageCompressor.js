/**
 * Validate image for banner upload:
 * - Accepts: PNG, JPG, JPEG, WEBP
 * - Max size: 2 MB
 */
export function validateBannerImage(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const allowedExtensions = /\.(jpe?g|png|webp)$/i;
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  const hasValidExt = allowedExtensions.test(file.name || '');
  const hasValidMime = file.type ? allowedMimeTypes.includes(file.type.toLowerCase()) : false;

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a PNG, JPG, JPEG, or WebP image.',
    };
  }

  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
  if (file.size > MAX_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeInMB} MB) exceeds the 2 MB limit. Please select an image under 2 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Converts any supported image (PNG, JPG, JPEG, WEBP) to WebP format.
 * Compresses with high visual fidelity while reducing file size drastically.
 */
export function compressAndConvertToWebP(file, maxDimension = 1600, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const validation = validateBannerImage(file);
    if (!validation.valid) {
      return reject(new Error(validation.error));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file from device.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image file. Please verify the file is not corrupted.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
          return reject(new Error('Canvas context unavailable'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP format
        let dataUrl = canvas.toDataURL('image/webp', quality);
        let format = 'webp';

        // Fallback to JPEG if the browser engine does not support WebP canvas export
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          format = 'jpeg';
        }

        resolve({
          dataUrl,
          format,
          width,
          height,
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Utility to compress image Files to JPEG base64 Data URLs before uploading/storing.
 * Prevents QuotaExceededError by keeping base64 payload sizes under ~50KB.
 */
export function compressImage(file, maxDimension = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || (!file.type?.startsWith('image/') && !/\.(jpe?g|png|webp|gif|avif)$/i.test(file.name || ''))) {
      return reject(new Error('Invalid image file'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

