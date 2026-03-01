/**
 * OpenRouter AI Service
 * 
 * Uses OpenRouter API with multiple models:
 * - xiaomi/mimo-v2-flash:free for text generation (creative variants)
 * - nvidia/nemotron-nano-12b-v2-vl:free for vision/image analysis
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model configurations
const MODELS = {
    TEXT: 'xiaomi/mimo-v2-flash:free',      // For text/creative generation
    VISION: 'nvidia/nemotron-nano-12b-v2-vl:free'  // For image analysis (multimodal)
};

class OpenRouterService {
    constructor() {
        this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    }

    hasApiKey() {
        return this.apiKey && this.apiKey.length > 10;
    }

    /**
     * Call OpenRouter API with a text prompt
     * @param {string} prompt - The text prompt
     * @param {object} options - Options like temperature, enableReasoning
     * @returns {Promise<string>} - The response text
     */
    async callOpenRouter(prompt, options = {}) {
        if (!this.hasApiKey()) {
            throw new Error('OpenRouter API key not configured');
        }

        const { temperature = 0.7, enableReasoning = false, model = MODELS.TEXT } = options;

        try {
            const requestBody = {
                model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature
            };

            // Enable reasoning if requested
            if (enableReasoning) {
                requestBody.reasoning = { enabled: true };
            }

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'AstraCreate'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`OpenRouter API request failed (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (error) {
            console.error('OpenRouter API call failed:', error);
            throw error;
        }
    }

    /**
     * Call OpenRouter API with vision/image input using Nemotron VL
     * @param {string} prompt - The text prompt
     * @param {string} imageDataUrl - Base64 image data URL
     * @param {object} options - Options
     * @returns {Promise<string>} - The response text
     */
    async callVision(prompt, imageDataUrl, options = {}) {
        if (!this.hasApiKey()) {
            throw new Error('OpenRouter API key not configured');
        }

        const { temperature = 0.3, enableReasoning = true } = options;

        try {
            // Format image for OpenRouter multimodal
            const imageContent = imageDataUrl.startsWith('data:')
                ? imageDataUrl
                : `data:image/jpeg;base64,${imageDataUrl}`;

            const requestBody = {
                model: MODELS.VISION,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageContent
                                }
                            }
                        ]
                    }
                ],
                temperature
            };

            // Enable reasoning for better analysis
            if (enableReasoning) {
                requestBody.reasoning = { enabled: true };
            }

            console.log('🔍 Calling Nemotron VL for image analysis...');

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'AstraCreate'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`Vision API request failed (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Nemotron VL response received');
            return data.choices?.[0]?.message?.content || '';
        } catch (error) {
            console.error('Vision API call failed:', error);
            throw error;
        }
    }

    /**
     * Analyze a product image using Nemotron VL vision model
     * @param {string} imageDataUrl - Base64 image data URL
     * @returns {Promise<object>} - Product analysis result
     */
    async analyzeProductImage(imageDataUrl) {
        // Check if it's demo mode
        if (imageDataUrl === 'demo') {
            return {
                success: true,
                productName: 'Coca-Cola Zero Sugar 2L',
                brand: 'Coca-Cola',
                category: 'Food & Drink',
                isAlcohol: false,
                packagingColors: ['#e51c23', '#1a1a1a', '#ffffff'],
                dominantColor: '#e51c23',
                suggestedBackground: '#1a1a1a',
                suggestedAccent: '#e51c23',
                suggestedTextColor: '#ffffff',
                confidence: 0.95
            };
        }

        const prompt = `Analyze this product image for a retail advertisement. 
Return ONLY valid JSON (no markdown, no code blocks):
{
    "productName": "Full product name with size/variant",
    "brand": "Brand name",
    "category": "Food & Drink / Alcohol / Health & Beauty / Household",
    "isAlcohol": true/false,
    "packagingColors": ["#hex1", "#hex2", "#hex3"],
    "dominantColor": "#hex",
    "suggestedBackground": "#hex (dark color that complements product)",
    "suggestedAccent": "#hex (vibrant accent color)",
    "suggestedTextColor": "#ffffff or #000000",
    "confidence": 0.0-1.0
}`;

        try {
            const result = await this.callVision(prompt, imageDataUrl);

            // Parse JSON from response
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    ...parsed
                };
            }

            // Fallback if parsing fails
            return this.getDefaultProductAnalysis();
        } catch (error) {
            console.error('Product image analysis failed:', error);
            return this.getDefaultProductAnalysis();
        }
    }

    /**
     * Default product analysis when vision fails
     */
    getDefaultProductAnalysis() {
        return {
            success: true,
            productName: 'Product',
            brand: 'Brand',
            category: 'Food & Drink',
            isAlcohol: false,
            packagingColors: ['#e51c23', '#1a1a1a', '#ffffff'],
            dominantColor: '#e51c23',
            suggestedBackground: '#1a1a1a',
            suggestedAccent: '#e51c23',
            suggestedTextColor: '#ffffff',
            confidence: 0.5
        };
    }

    /**
     * Generate background suggestions based on category
     */
    generateBackgroundSuggestions(category, mood = 'modern') {
        const backgrounds = {
            'Food & Drink': {
                solid: ['#1a1a2e', '#2d3436', '#0a0a0a', '#16213e', '#1a472a'],
                gradients: ['linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'],
            },
            'Alcohol': {
                solid: ['#1a1a2e', '#0f0f23', '#1c1c3c', '#2c1810', '#0d0d0d'],
                gradients: ['linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)'],
            },
            'Health & Beauty': {
                solid: ['#f5e6e0', '#fff5f5', '#fef6f6', '#e8f5e9', '#ffffff'],
                gradients: ['linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'],
            },
            'Household': {
                solid: ['#e8f4f8', '#f0f8ff', '#e3f2fd', '#ffffff', '#fafafa'],
                gradients: ['linear-gradient(135deg, #667eea 0%, #764ba2 100%)'],
            },
        };

        const categoryBgs = backgrounds[category] || backgrounds['Food & Drink'];
        return {
            solid: categoryBgs.solid,
            gradients: categoryBgs.gradients || [],
            recommended: categoryBgs.solid[0],
        };
    }

    /**
     * Generate creative variants for a product using mimo model
     */
    async generateCreativeVariants(productAnalysis, options = {}) {
        const { userPrompt = '' } = options;

        const prompt = `You are a world-class creative director generating retail ad copy for Tesco UK.

Product: ${productAnalysis.productName}
Brand: ${productAnalysis.brand}
Category: ${productAnalysis.category}
${productAnalysis.isAlcohol ? '⚠️ ALCOHOL PRODUCT' : ''}

${userPrompt ? `Creative Direction: "${userPrompt}"` : 'Generate diverse, high-performing retail ad concepts.'}

Generate 5 UNIQUE creative variants with DIFFERENT styles and tones.
Be bold, creative, and compelling.

⚠️ IMPORTANT COPY RULES:
- Headline: MAX 35 characters (3-5 punchy words)
- Subhead: MAX 20 words (short supporting text)
- Never use "free" (use "zero sugar", "low fat" instead)

Return ONLY valid JSON (no markdown):
{
  "variants": [
    {
      "id": 1,
      "tone": "bold",
      "headline": "Short Punchy Headline",
      "subheadline": "Brief supporting text",
      "tag": "Only at Tesco",
      "priceType": "clubcard",
      "backgroundColor": "#1a1a1a",
      "textColor": "#ffffff"
    }
  ]
}`;

        try {
            const result = await this.callOpenRouter(prompt, {
                temperature: 0.9,
                model: MODELS.TEXT
            });

            // Parse JSON from response
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.variants || [];
            }

            return [];
        } catch (error) {
            console.error('Creative variant generation failed:', error);
            return [];
        }
    }
    /**
     * AI-Powered Auto-Fix for compliance issues
     * Uses Nemotron VL for visual context and Mimo for text/logic
     */
    async autoFixCompliance(canvasDataUrl, issues, objects, format) {
        const prompt = `You are a creative compliance expert for Tesco UK. 
Analyze the current canvas and the list of compliance issues.
Suggest specific property updates for each object to fix ALL issues.

FORMAT: ${JSON.stringify(format)}
ISSUES: ${JSON.stringify(issues)}
OBJECTS: ${JSON.stringify(objects.map(o => ({
            id: o.id,
            type: o.type,
            text: o.text || o.headline || '',
            left: o.left,
            top: o.top,
            fontSize: o.fontSize,
            fill: o.fill,
            customName: o.customName,
            isPackshot: o.isPackshot,
            isValueTile: o.isValueTile,
            isDrinkaware: o.isDrinkaware,
            isTag: o.isTag
        })))}

GUIDELINES:
1. Fix Safe Zone violations by moving elements (top > 200, bottom < height - 250 for 9:16).
2. Fix prohibited terms (FREE, WIN, etc.) by suggesting better copy.
3. Fix font size issues (min 20px).
4. Fix contrast issues by suggesting better colors.
5. Fix overlapping elements by repositioning.
6. Fix missing required elements (Drinkaware for alcohol, etc.).

Return ONLY valid JSON (no markdown):
{
  "fixes": [
    {
      "id": "object_id",
      "updates": {
        "left": 100,
        "top": 200,
        "fontSize": 24,
        "text": "New Compliant Text",
        "fill": "#ffffff"
      },
      "explanation": "Brief reason for fix"
    }
  ],
  "summary": "Fixed X issues related to Y"
}`;

        try {
            const result = await this.callVision(prompt, canvasDataUrl, {
                temperature: 0.2,
                enableReasoning: true
            });

            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { fixes: [], summary: "Could not parse AI response" };
        } catch (error) {
            console.error('Auto-fix compliance failed:', error);
            return { fixes: [], summary: "AI service error" };
        }
    }
}

// Singleton instance
const openRouterService = new OpenRouterService();
export default openRouterService;
