import { describe, it, expect } from 'vitest';
import { validateBannerImage } from './imageCompressor';

describe('validateBannerImage', () => {
  it('rejects null or undefined file', () => {
    expect(validateBannerImage(null)).toEqual({
      valid: false,
      error: 'No file selected.',
    });
    expect(validateBannerImage(undefined)).toEqual({
      valid: false,
      error: 'No file selected.',
    });
  });

  it('rejects unsupported file formats', () => {
    const gifFile = { name: 'banner.gif', type: 'image/gif', size: 1024 };
    const svgFile = { name: 'vector.svg', type: 'image/svg+xml', size: 1024 };
    const pdfFile = { name: 'doc.pdf', type: 'application/pdf', size: 1024 };

    expect(validateBannerImage(gifFile).valid).toBe(false);
    expect(validateBannerImage(svgFile).valid).toBe(false);
    expect(validateBannerImage(pdfFile).valid).toBe(false);
  });

  it('accepts valid PNG, JPG, JPEG, and WebP images within 2 MB', () => {
    const pngFile = { name: 'banner.png', type: 'image/png', size: 500 * 1024 };
    const jpgFile = { name: 'banner.jpg', type: 'image/jpeg', size: 1.5 * 1024 * 1024 };
    const jpegFile = { name: 'banner.jpeg', type: 'image/jpeg', size: 1 * 1024 * 1024 };
    const webpFile = { name: 'banner.webp', type: 'image/webp', size: 800 * 1024 };

    expect(validateBannerImage(pngFile)).toEqual({ valid: true });
    expect(validateBannerImage(jpgFile)).toEqual({ valid: true });
    expect(validateBannerImage(jpegFile)).toEqual({ valid: true });
    expect(validateBannerImage(webpFile)).toEqual({ valid: true });
  });

  it('rejects images exceeding 2 MB', () => {
    const oversizeFile = {
      name: 'large_banner.png',
      type: 'image/png',
      size: 2.5 * 1024 * 1024,
    };

    const res = validateBannerImage(oversizeFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds the 2 MB limit');
  });
});
