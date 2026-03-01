/**
 * Cloudinary Provider
 * Smart image transformations and CDN delivery:
 * - Smart resize with AI cropping (g_auto)
 * - Format optimization
 * - Size optimization (under 500KB)
 */

class CloudinaryProvider {
    constructor() {
        this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
        this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || '';
        this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
        this.uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
    }

    /**
     * Check if Cloudinary is configured
     */
    isConfigured() {
        return this.cloudName && this.cloudName.length > 0;
    }

    /**
     * Upload an image to Cloudinary
     * @param {string} imageDataUrl - Base64 image data URL
     * @returns {Promise<{ success: boolean, publicId?: string, url?: string }>}
     */
    async upload(imageDataUrl) {
        if (!this.isConfigured()) {
            return { success: false, error: 'Cloudinary not configured' };
        }

        try {
            const formData = new FormData();
            formData.append('file', imageDataUrl);
            formData.append('upload_preset', this.uploadPreset);

            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                success: true,
                publicId: data.public_id,
                url: data.secure_url,
                width: data.width,
                height: data.height,
                format: data.format,
                bytes: data.bytes,
            };
        } catch (error) {
            console.error('Cloudinary upload failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Build transformation URL for smart resize
     * @param {string} publicId - Cloudinary public ID
     * @param {object} options - { width, height, crop, gravity, format, quality }
     * @returns {string} Transformed image URL
     */
    buildTransformUrl(publicId, options = {}) {
        const {
            width,
            height,
            crop = 'fill',
            gravity = 'auto',  // AI-powered focal point
            format = 'auto',
            quality = 'auto:best',
        } = options;

        const transforms = [];

        if (width || height) {
            let t = 'c_' + crop;
            if (gravity) t += ',g_' + gravity;
            if (width) t += ',w_' + width;
            if (height) t += ',h_' + height;
            transforms.push(t);
        }

        transforms.push(`f_${format}`);
        transforms.push(`q_${quality}`);

        const transformString = transforms.join('/');
        return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformString}/${publicId}`;
    }

    /**
     * Smart resize with AI-based focal point detection
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {object} targetSize - { width, height }
     * @returns {Promise<{ success: boolean, imageDataUrl?: string }>}
     */
    async smartResize(imageDataUrl, targetSize) {
        if (!this.isConfigured()) {
            // Fallback to canvas-based resize
            return this.canvasResize(imageDataUrl, targetSize);
        }

        try {
            // Upload to Cloudinary
            const uploadResult = await this.upload(imageDataUrl);
            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }

            // Build transform URL with AI gravity
            const transformUrl = this.buildTransformUrl(uploadResult.publicId, {
                width: targetSize.width,
                height: targetSize.height,
                crop: 'fill',
                gravity: 'auto',  // AI detects focal point
                format: 'webp',
                quality: 'auto:best',
            });

            // Fetch transformed image
            const response = await fetch(transformUrl);
            const blob = await response.blob();
            const resultDataUrl = await this.blobToDataUrl(blob);

            return {
                success: true,
                imageDataUrl: resultDataUrl,
                cloudinaryUrl: transformUrl,
            };
        } catch (error) {
            console.error('Cloudinary smart resize failed:', error);
            // Fallback to canvas-based resize
            return this.canvasResize(imageDataUrl, targetSize);
        }
    }

    /**
     * Optimize image to be under target size (e.g., 500KB)
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {number} maxBytes - Maximum size in bytes
     * @returns {Promise<{ success: boolean, imageDataUrl?: string, bytes?: number }>}
     */
    async optimizeSize(imageDataUrl, maxBytes = 500 * 1024) {
        if (!this.isConfigured()) {
            return this.canvasOptimize(imageDataUrl, maxBytes);
        }

        try {
            const uploadResult = await this.upload(imageDataUrl);
            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }

            // Try progressive quality reduction
            const qualities = ['auto:best', 'auto:good', 'auto:eco', 'auto:low'];

            for (const quality of qualities) {
                const transformUrl = this.buildTransformUrl(uploadResult.publicId, {
                    format: 'webp',
                    quality,
                });

                const response = await fetch(transformUrl);
                const blob = await response.blob();

                if (blob.size <= maxBytes) {
                    const resultDataUrl = await this.blobToDataUrl(blob);
                    return {
                        success: true,
                        imageDataUrl: resultDataUrl,
                        bytes: blob.size,
                        quality,
                    };
                }
            }

            // If still too large, resize down
            const uploadData = uploadResult;
            const scale = Math.sqrt(maxBytes / uploadData.bytes);
            const newWidth = Math.floor(uploadData.width * scale);
            const newHeight = Math.floor(uploadData.height * scale);

            return this.smartResize(imageDataUrl, { width: newWidth, height: newHeight });
        } catch (error) {
            console.error('Cloudinary optimization failed:', error);
            return this.canvasOptimize(imageDataUrl, maxBytes);
        }
    }

    // ============================================
    // FALLBACK: Canvas-based operations
    // ============================================

    /**
     * Canvas-based resize (fallback when Cloudinary not available)
     */
    async canvasResize(imageDataUrl, targetSize) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetSize.width;
                canvas.height = targetSize.height;
                const ctx = canvas.getContext('2d');

                // Calculate crop to maintain aspect ratio
                const sourceAspect = img.width / img.height;
                const targetAspect = targetSize.width / targetSize.height;

                let sx = 0, sy = 0, sw = img.width, sh = img.height;

                if (sourceAspect > targetAspect) {
                    // Source is wider - crop sides
                    sw = img.height * targetAspect;
                    sx = (img.width - sw) / 2;
                } else {
                    // Source is taller - crop top/bottom
                    sh = img.width / targetAspect;
                    sy = (img.height - sh) / 2;
                }

                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetSize.width, targetSize.height);

                resolve({
                    success: true,
                    imageDataUrl: canvas.toDataURL('image/png'),
                    fallback: true,
                });
            };
            img.onerror = () => {
                resolve({ success: false, error: 'Failed to load image' });
            };
            img.src = imageDataUrl;
        });
    }

    /**
     * Canvas-based optimization (fallback)
     */
    async canvasOptimize(imageDataUrl, maxBytes) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let quality = 0.9;
                let canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Try reducing quality
                while (quality > 0.1) {
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const bytes = Math.round((dataUrl.length - 22) * 0.75); // Approximate size

                    if (bytes <= maxBytes) {
                        resolve({
                            success: true,
                            imageDataUrl: dataUrl,
                            bytes,
                            quality,
                            fallback: true,
                        });
                        return;
                    }
                    quality -= 0.1;
                }

                // If still too large, resize
                const scale = Math.sqrt(maxBytes / (img.width * img.height * 3));
                canvas.width = Math.floor(img.width * scale);
                canvas.height = Math.floor(img.height * scale);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve({
                    success: true,
                    imageDataUrl: canvas.toDataURL('image/jpeg', 0.8),
                    fallback: true,
                });
            };
            img.onerror = () => resolve({ success: false, error: 'Failed to load image' });
            img.src = imageDataUrl;
        });
    }

    /**
     * Convert Blob to data URL
     */
    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Singleton instance
const cloudinaryProvider = new CloudinaryProvider();
export default cloudinaryProvider;
