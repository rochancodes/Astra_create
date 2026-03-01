/**
 * AI Orchestrator
 * Central routing layer for all AI capabilities.
 * 
 * Routes requests to optimal provider with fallback chains:
 * 
 * | Capability          | Primary           | Fallback          |
 * |---------------------|-------------------|-------------------|
 * | Text validation     | Regex             | HF BART-MNLI      |
 * | People detection    | HF DETR           | Gemini            |
 * | Logo detection      | Gemini Flash      | -                 |
 * | Packshot count      | HF DETR           | Geometry          |
 * | Background removal  | WithoutBG API     | -                 |
 * | Background gen      | HF FLUX           | HF SDXL           |
 * | Smart resize        | Cloudinary        | Canvas            |
 * | Safe zones          | Deterministic     | -                 |
 * | Accessibility       | Deterministic     | -                 |
 */

import huggingfaceProvider from './providers/huggingface';
import cloudinaryProvider from './providers/cloudinary';
import geminiService from './geminiService';
import backgroundRemovalService from './backgroundRemovalService';

class AIOrchestrator {
    constructor() {
        this.providers = {
            huggingface: huggingfaceProvider,
            cloudinary: cloudinaryProvider,
            gemini: geminiService,
            withoutbg: backgroundRemovalService,
        };

        // Track API usage for rate limiting
        this.usage = {
            huggingface: { calls: 0, lastReset: Date.now() },
            gemini: { calls: 0, lastReset: Date.now() },
            cloudinary: { calls: 0, lastReset: Date.now() },
        };
    }

    // ============================================
    // PEOPLE DETECTION
    // Primary: HuggingFace DETR
    // Fallback: Gemini Vision
    // ============================================

    /**
     * Detect people in an image
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {object} options - { useFallback }
     * @returns {Promise<{ detected: boolean, count: number, confidence: number }>}
     */
    async detectPeople(imageDataUrl, options = {}) {
        // Try DETR first (HuggingFace)
        try {
            const result = await huggingfaceProvider.detectPeople(imageDataUrl);
            if (result.detected || !result.error) {
                return { ...result, provider: 'huggingface_detr' };
            }
        } catch (error) {
            console.warn('DETR people detection failed:', error);
        }

        // Fallback to Gemini vision
        try {
            const result = await geminiService.detectPeopleInImage(imageDataUrl);
            return {
                detected: result.hasPeople || false,
                count: result.facesDetected || 0,
                confidence: result.confidence || 0,
                provider: 'gemini',
            };
        } catch (error) {
            console.warn('Gemini people detection failed:', error);
            return { detected: false, count: 0, confidence: 0, error: 'All providers failed' };
        }
    }

    // ============================================
    // PACKSHOT DETECTION
    // Primary: HuggingFace DETR
    // ============================================

    /**
     * Count packshots (product images) in a creative
     * @param {string} imageDataUrl - Canvas snapshot as data URL
     * @returns {Promise<{ count: number, detections: Array }>}
     */
    async countPackshots(imageDataUrl) {
        try {
            const result = await huggingfaceProvider.countPackshots(imageDataUrl);
            return { ...result, provider: 'huggingface_detr' };
        } catch (error) {
            console.warn('DETR packshot detection failed:', error);
            // Geometry-based fallback would use canvas object metadata
            return { count: 0, detections: [], error: error.message };
        }
    }

    // ============================================
    // BACKGROUND REMOVAL
    // Provider: WithoutBG API
    // ============================================

    /**
     * Remove background from an image
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {object} options - { provider }
     * @returns {Promise<{ success: boolean, resultDataUrl?: string }>}
     */
    async removeBackground(imageDataUrl, options = {}) {
        try {
            const result = await backgroundRemovalService.removeBackground(imageDataUrl, options);
            return { ...result, provider: 'withoutbg' };
        } catch (error) {
            console.warn('WithoutBG background removal failed:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // BACKGROUND GENERATION
    // Primary: HuggingFace FLUX
    // Fallback: HuggingFace SDXL
    // ============================================

    /**
     * Generate background image from prompt
     * @param {string} prompt - Description of desired background
     * @param {object} options - { width, height, style }
     * @returns {Promise<{ success: boolean, imageDataUrl?: string }>}
     */
    async generateBackground(prompt, options = {}) {
        const {
            width = 1024,
            height = 1024,
            style = 'abstract',
        } = options;

        // Build safe prompt (no text, no products)
        const safePrompt = `${prompt}, ${style} style, no text, no logos, no products, pure background`;

        try {
            const result = await huggingfaceProvider.generateBackground(safePrompt, {
                width,
                height,
                useFlux: true, // Try FLUX first, falls back to SDXL internally
            });

            return {
                ...result,
                provider: result.success ? 'huggingface_flux' : 'huggingface_sdxl',
            };
        } catch (error) {
            console.error('Background generation failed:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // SMART RESIZE
    // Primary: Cloudinary (g_auto)
    // Fallback: Canvas-based
    // ============================================

    /**
     * Smart resize with AI-based focal point detection
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {object} targetSize - { width, height }
     * @returns {Promise<{ success: boolean, imageDataUrl?: string }>}
     */
    async smartResize(imageDataUrl, targetSize) {
        const result = await cloudinaryProvider.smartResize(imageDataUrl, targetSize);
        return {
            ...result,
            provider: result.fallback ? 'canvas' : 'cloudinary',
        };
    }

    /**
     * Optimize image to be under 500KB
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {number} maxBytes - Maximum size (default 500KB)
     * @returns {Promise<{ success: boolean, imageDataUrl?: string, bytes?: number }>}
     */
    async optimizeSize(imageDataUrl, maxBytes = 500 * 1024) {
        const result = await cloudinaryProvider.optimizeSize(imageDataUrl, maxBytes);
        return {
            ...result,
            provider: result.fallback ? 'canvas' : 'cloudinary',
        };
    }

    // ============================================
    // TEXT VALIDATION (NLI)
    // Primary: Regex
    // Fallback: HuggingFace BART-MNLI
    // ============================================

    /**
     * Check if text contains prohibited content semantically
     * @param {string} text - Text to check
     * @param {string} hypothesis - Semantic hypothesis to check
     * @returns {Promise<{ entails: boolean, confidence: number }>}
     */
    async checkTextSemantic(text, hypothesis) {
        try {
            const result = await huggingfaceProvider.checkEntailment(text, hypothesis);
            return { ...result, provider: 'huggingface_bart' };
        } catch (error) {
            console.warn('NLI check failed:', error);
            return { entails: false, confidence: 0, error: error.message };
        }
    }

    // ============================================
    // LOGO DETECTION
    // Primary: Gemini Flash
    // ============================================

    /**
     * Detect and verify logo presence
     * @param {string} imageDataUrl - Canvas snapshot
     * @param {string} logoType - 'drinkaware' | 'tesco' | 'brand'
     * @returns {Promise<{ detected: boolean, valid: boolean, issues: Array }>}
     */
    async detectLogo(imageDataUrl, logoType) {
        try {
            if (logoType === 'drinkaware') {
                // Use existing vision detector
                const { visionDetector } = await import('../compliance/detectors/visionDetector');
                const result = await visionDetector.verifyDrinkawareLogo(imageDataUrl);
                return { ...result, provider: 'gemini' };
            }

            // Generic logo detection via Gemini
            const prompt = `Is there a ${logoType} logo visible in this image? Respond with JSON: { "detected": boolean, "description": string }`;
            const response = await geminiService.callGeminiVision(
                prompt,
                imageDataUrl.split(',')[1],
                'image/png'
            );

            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                const result = JSON.parse(match[0]);
                return { ...result, provider: 'gemini' };
            }

            return { detected: false, provider: 'gemini' };
        } catch (error) {
            console.warn('Logo detection failed:', error);
            return { detected: false, error: error.message };
        }
    }

    // ============================================
    // CAPABILITY STATUS
    // ============================================

    /**
     * Get status of all AI capabilities
     * @returns {object} Status of each capability
     */
    getStatus() {
        return {
            textValidation: {
                regex: true, // Always available
                nli: huggingfaceProvider.hasApiKey(),
            },
            peopleDetection: {
                detr: huggingfaceProvider.hasApiKey(),
                gemini: geminiService.hasApiKey(),
            },
            logoDetection: {
                gemini: geminiService.hasApiKey(),
            },
            packshotDetection: {
                detr: huggingfaceProvider.hasApiKey(),
            },
            backgroundRemoval: {
                withoutbg: backgroundRemovalService.hasApiKey(),
            },
            backgroundGeneration: {
                flux: huggingfaceProvider.hasApiKey(),
                sdxl: huggingfaceProvider.hasApiKey(),
            },
            smartResize: {
                cloudinary: cloudinaryProvider.isConfigured(),
                canvas: true, // Always available
            },
        };
    }

    /**
     * Get recommended provider for a capability
     */
    getRecommendedProvider(capability) {
        const status = this.getStatus();
        const cap = status[capability];

        if (!cap) return null;

        // Return first available provider
        for (const [provider, available] of Object.entries(cap)) {
            if (available) return provider;
        }
        return null;
    }
}

// Singleton instance
const aiOrchestrator = new AIOrchestrator();
export default aiOrchestrator;
