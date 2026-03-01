/**
 * HuggingFace Provider
 * Unified interface for HuggingFace Inference API services:
 * - DETR: Object detection (people, packshots)
 * - BART-MNLI: Natural language inference
 * - FLUX: Background image generation
 */

import { HfInference } from '@huggingface/inference';

class HuggingFaceProvider {
    constructor() {
        this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';
        this.client = null;
        this.models = {
            // Object Detection
            detr: 'facebook/detr-resnet-50',
            detrLarge: 'facebook/detr-resnet-101',

            // Natural Language Inference
            bartNli: 'facebook/bart-large-mnli',

            // Image Generation
            flux: 'black-forest-labs/FLUX.1-schnell',
            sdxl: 'stabilityai/stable-diffusion-xl-base-1.0',
        };
    }

    /**
     * Initialize or get HuggingFace client
     */
    getClient() {
        if (!this.client) {
            this.client = new HfInference(this.apiKey || undefined);
        }
        return this.client;
    }

    /**
     * Check if API key is configured
     */
    hasApiKey() {
        return this.apiKey && this.apiKey.length > 5;
    }

    /**
     * Set API key at runtime
     */
    setApiKey(key) {
        this.apiKey = key;
        this.client = new HfInference(key);
    }

    // ============================================
    // OBJECT DETECTION (DETR)
    // ============================================

    /**
     * Detect objects in an image using DETR
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {object} options - { threshold, labels }
     * @returns {Promise<Array<{ label: string, score: number, box: object }>>}
     */
    async detectObjects(imageDataUrl, options = {}) {
        const { threshold = 0.7, labels = null } = options;

        try {
            const hf = this.getClient();

            // Convert data URL to Blob
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();

            const result = await hf.objectDetection({
                model: this.models.detr,
                data: blob,
            });

            // Filter by threshold and optionally by labels
            let detections = result.filter(d => d.score >= threshold);

            if (labels && labels.length > 0) {
                detections = detections.filter(d =>
                    labels.some(l => d.label.toLowerCase().includes(l.toLowerCase()))
                );
            }

            return {
                success: true,
                detections: detections.map(d => ({
                    label: d.label,
                    score: d.score,
                    box: d.box, // { xmin, ymin, xmax, ymax }
                })),
            };
        } catch (error) {
            console.error('DETR detection failed:', error);
            return { success: false, error: error.message, detections: [] };
        }
    }

    /**
     * Detect people in an image
     * @param {string} imageDataUrl - Base64 image data URL
     * @returns {Promise<{ detected: boolean, count: number, boxes: Array }>}
     */
    async detectPeople(imageDataUrl) {
        const result = await this.detectObjects(imageDataUrl, {
            threshold: 0.7,
            labels: ['person'],
        });

        if (!result.success) {
            return { detected: false, count: 0, boxes: [], error: result.error };
        }

        const people = result.detections.filter(d => d.label === 'person');

        return {
            detected: people.length > 0,
            count: people.length,
            boxes: people.map(p => p.box),
            confidence: people.length > 0 ? Math.max(...people.map(p => p.score)) : 0,
        };
    }

    /**
     * Count packshots (product images) in an image
     * Looking for bottles, boxes, packages, etc.
     * @param {string} imageDataUrl - Base64 image data URL
     * @returns {Promise<{ count: number, detections: Array }>}
     */
    async countPackshots(imageDataUrl) {
        const productLabels = [
            'bottle', 'wine glass', 'cup', 'bowl', 'banana', 'apple', 'sandwich',
            'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
            'potted plant', 'vase', 'teddy bear', 'handbag', 'suitcase',
        ];

        const result = await this.detectObjects(imageDataUrl, {
            threshold: 0.5,
            labels: productLabels,
        });

        if (!result.success) {
            return { count: 0, detections: [], error: result.error };
        }

        return {
            count: result.detections.length,
            detections: result.detections,
        };
    }



    // ============================================
    // NATURAL LANGUAGE INFERENCE (BART-MNLI)
    // ============================================

    /**
     * Check if text entails a hypothesis using BART-MNLI
     * @param {string} text - Input text (premise)
     * @param {string} hypothesis - Claim to check
     * @param {number} threshold - Confidence threshold
     * @returns {Promise<{ entails: boolean, confidence: number }>}
     */
    async checkEntailment(text, hypothesis, threshold = 0.7) {
        try {
            const hf = this.getClient();

            const result = await hf.zeroShotClassification({
                model: this.models.bartNli,
                inputs: text,
                parameters: {
                    candidate_labels: [hypothesis],
                    multi_label: false,
                },
            });

            const confidence = result.scores[0] || 0;

            return {
                entails: confidence >= threshold,
                confidence,
                label: result.labels[0],
            };
        } catch (error) {
            console.error('NLI check failed:', error);
            return { entails: false, confidence: 0, error: error.message };
        }
    }

    // ============================================
    // IMAGE GENERATION (FLUX/SDXL)
    // ============================================

    /**
     * Generate background image using FLUX or SDXL
     * @param {string} prompt - Description of the background
     * @param {object} options - { width, height, numSteps, seed }
     * @returns {Promise<{ success: boolean, imageDataUrl?: string }>}
     */
    async generateBackground(prompt, options = {}) {
        const {
            width = 1024,
            height = 1024,
            numSteps = 4,
            guidanceScale = 3.5,
            useFlux = true,
        } = options;

        try {
            const hf = this.getClient();
            const model = useFlux ? this.models.flux : this.models.sdxl;

            console.log(`🎨 Generating background with ${useFlux ? 'FLUX' : 'SDXL'}...`);
            const startTime = Date.now();

            // Safety prompt to avoid text/logos
            const safePrompt = `${prompt}. Abstract, no text, no logos, no product images, pure background pattern.`;

            const result = await hf.textToImage({
                model,
                inputs: safePrompt,
                parameters: {
                    width,
                    height,
                    num_inference_steps: numSteps,
                    guidance_scale: guidanceScale,
                },
            });

            if (result instanceof Blob) {
                const imageDataUrl = await this.blobToDataUrl(result);
                console.log(`✅ Background generated in ${Date.now() - startTime}ms`);
                return { success: true, imageDataUrl };
            }

            return { success: false, error: 'Unexpected response format' };
        } catch (error) {
            console.error('Background generation failed:', error);

            // Fallback to SDXL if FLUX failed
            if (options.useFlux !== false) {
                console.log('Falling back to SDXL...');
                return this.generateBackground(prompt, { ...options, useFlux: false });
            }

            return { success: false, error: error.message };
        }
    }

    // ============================================
    // UTILITIES
    // ============================================

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

    /**
     * Extract base64 from data URL
     */
    extractBase64(dataUrl) {
        const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
        return match ? match[1] : dataUrl;
    }
}

// Singleton instance
const huggingfaceProvider = new HuggingFaceProvider();
export default huggingfaceProvider;
