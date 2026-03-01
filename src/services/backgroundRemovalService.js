// Background Removal Service using WithoutBG API
// State-of-the-art background removal for packshots via base64 API

// Use Vite proxy to bypass CORS (see vite.config.js)
const WITHOUTBG_API_URL = '/api/withoutbg/v1.0/image-without-background-base64';

class BackgroundRemovalService {
    constructor() {
        this.apiKey = import.meta.env.VITE_WITHOUTBG_API_KEY || '';
        this.isProcessing = false;
        this.lastError = null;
    }

    /**
     * Check if API key is configured
     */
    hasApiKey() {
        return this.apiKey && this.apiKey.length > 5;
    }

    /**
     * Set API key dynamically
     */
    setApiKey(key) {
        if (key && key.length > 5) {
            this.apiKey = key;
            localStorage.setItem('withoutbg_api_key', key);
        }
    }

    /**
     * Load API key from localStorage if available
     */
    loadApiKey() {
        const stored = localStorage.getItem('withoutbg_api_key');
        if (stored && stored.length > 5) {
            this.apiKey = stored;
        }
        return this.hasApiKey();
    }

    /**
     * Extract raw base64 data from data URL
     * Removes the "data:image/...;base64," prefix
     */
    extractBase64FromDataUrl(dataUrl) {
        const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
        if (match) {
            return match[1];
        }
        // If no prefix found, assume it's already raw base64
        return dataUrl;
    }

    /**
     * Convert raw base64 to data URL
     */
    base64ToDataUrl(base64, mimeType = 'image/png') {
        return `data:${mimeType};base64,${base64}`;
    }

    /**
     * Sleep utility for retry backoff
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Remove background from an image using WithoutBG API
     * @param {string} imageDataUrl - Base64 data URL of the image (with or without prefix)
     * @param {Object} options - Optional settings
     * @returns {Promise<{success: boolean, resultDataUrl?: string, error?: string}>}
     */
    async removeBackground(imageDataUrl, options = {}) {
        if (this.isProcessing) {
            return { success: false, error: 'Background removal already in progress' };
        }

        if (!this.hasApiKey()) {
            this.loadApiKey();
            if (!this.hasApiKey()) {
                return { success: false, error: 'WithoutBG API key not configured. Add VITE_WITHOUTBG_API_KEY to .env' };
            }
        }

        this.isProcessing = true;
        this.lastError = null;

        try {
            // Extract raw base64 (remove data URL prefix if present)
            const rawBase64 = this.extractBase64FromDataUrl(imageDataUrl);

            console.log('🎨 Sending image to WithoutBG API for background removal...');
            const startTime = Date.now();

            // Call WithoutBG API
            const response = await fetch(WITHOUTBG_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify({
                    image_base64: rawBase64,
                }),
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch {
                    // Ignore JSON parse errors
                }

                // Handle specific error codes
                if (response.status === 401) {
                    throw new Error('Invalid API Key. Check your VITE_WITHOUTBG_API_KEY.');
                } else if (response.status === 402) {
                    throw new Error('Insufficient credits. Please top up at withoutbg.com');
                } else if (response.status === 403) {
                    throw new Error('Credits expired. Please top up to reactivate.');
                } else if (response.status === 413) {
                    throw new Error('Image too large. Maximum size is 10 MB.');
                } else if (response.status === 415) {
                    throw new Error('Unsupported format. Use JPEG, PNG, WebP, TIFF, BMP, or GIF.');
                } else if (response.status === 429) {
                    throw new Error('Rate limited (7 req/min). Please wait and try again.');
                } else {
                    throw new Error(errorMessage);
                }
            }

            const data = await response.json();

            if (!data.img_without_background_base64) {
                throw new Error('Invalid response: missing result image');
            }

            // Convert raw base64 back to data URL
            const resultDataUrl = this.base64ToDataUrl(data.img_without_background_base64, 'image/png');

            const processingTime = Date.now() - startTime;
            console.log(`✅ Background removed successfully in ${processingTime}ms`);

            return {
                success: true,
                resultDataUrl,
                processingTimeMs: processingTime,
            };

        } catch (error) {
            console.error('❌ Background removal failed:', error);
            this.lastError = error.message;
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Remove background with automatic retry for rate limiting
     * @param {string} imageDataUrl - Base64 data URL of the image
     * @param {number} maxRetries - Maximum number of retries (default: 3)
     * @param {function} onProgress - Progress callback
     */
    async removeBackgroundWithRetry(imageDataUrl, maxRetries = 3, onProgress = null) {
        let attempt = 0;

        while (attempt < maxRetries) {
            if (onProgress) {
                onProgress({
                    attempt: attempt + 1,
                    maxRetries,
                    status: attempt === 0 ? 'Removing background...' : `Retry ${attempt}/${maxRetries}...`,
                });
            }

            const result = await this.removeBackground(imageDataUrl);

            if (result.success) {
                return result;
            }

            // Check if it's a rate limit error (can retry)
            if (result.error && result.error.includes('Rate limited')) {
                attempt++;
                if (attempt < maxRetries) {
                    // Exponential backoff: 10s, 20s, 40s
                    const waitTime = 10000 * Math.pow(2, attempt - 1);
                    if (onProgress) {
                        onProgress({
                            attempt,
                            maxRetries,
                            status: `Rate limited, waiting ${waitTime / 1000}s...`,
                            waitingForRateLimit: true,
                        });
                    }
                    await this.sleep(waitTime);
                    continue;
                }
            }

            // Non-recoverable error or max retries exceeded
            return result;
        }

        return { success: false, error: 'Max retries exceeded' };
    }

    /**
     * Get processing status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            hasApiKey: this.hasApiKey(),
            lastError: this.lastError,
        };
    }
}

// Singleton instance
const backgroundRemovalService = new BackgroundRemovalService();
export default backgroundRemovalService;
