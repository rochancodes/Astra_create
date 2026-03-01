/**
 * Creative Spec Service
 * 
 * Focuses purely on AI creative generation without compliance enforcement.
 * Compliance is handled separately in the pipeline AFTER this service returns.
 * 
 * Pipeline: User Input → AI Creative Spec → Compliance Filter → Canvas Build → Export
 * 
 * Now using OpenRouter with xiaomi/mimo-v2-flash:free model
 */

import openRouterService from './openRouterService';

/**
 * Generate creative variants from a product image
 * This is the "AI Creative Spec" step - focused purely on creativity
 * 
 * @param {string} imageDataUrl - Product image data URL
 * @param {object} options - Generation options
 * @returns {Promise<CreativeSpec>} - Raw creative spec from AI (unchecked for compliance)
 */
export async function generateCreativeSpec(imageDataUrl, options = {}) {
    const startTime = Date.now();
    const { userPrompt = '', mood = 'modern' } = options;

    // Handle demo mode - return pre-designed demo campaign
    if (imageDataUrl === 'demo') {
        return getDemoCreativeSpec(startTime, userPrompt);
    }

    // Step 1: Analyze the product image (via OpenRouter)
    const productAnalysis = await openRouterService.analyzeProductImage(imageDataUrl);

    // Step 2: Generate background suggestions
    const backgrounds = openRouterService.generateBackgroundSuggestions(
        productAnalysis.category,
        mood
    );

    // Step 3: Generate creative variants
    // Layout is handled separately by compliantTemplateBuilder - AI only generates copy
    const prompt = `You are a world-class creative director generating retail ad copy for Tesco UK.
    
Product: ${productAnalysis.productName}
Brand: ${productAnalysis.brand}
Category: ${productAnalysis.category}
${productAnalysis.isAlcohol ? '⚠️ ALCOHOL PRODUCT' : ''}

${userPrompt ? `Creative Direction: "${userPrompt}"` : 'Generate diverse, high-performing retail ad concepts.'}

Generate 5 UNIQUE creative variants with DIFFERENT styles and tones.
Be bold, creative, and compelling. Focus on copy that drives engagement.

⚠️ IMPORTANT COPY RULES:
- Headline: MAX 35 characters (3-5 punchy words)
- Subhead: MAX 20 words (short supporting text)
- Never use "free" (use "zero sugar", "low fat" instead)

Return ONLY valid JSON (no markdown):
{
  "variants": [
    {
      "id": 1,
      "tone": "bold/friendly/premium/minimal/playful",
      "headline": "Short Punchy Headline",
      "subheadline": "Brief supporting text under 20 words",
      "tag": "Only at Tesco",
      "priceType": "clubcard/white/new",
      "backgroundColor": "#1a1a1a",
      "textColor": "#ffffff"
    }
  ]
}
`;

    try {
        const result = await openRouterService.callOpenRouter(prompt, { temperature: 0.9 });

        let variants = [];
        const jsonMatch = result.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            variants = (parsed.variants || []).map((v, i) => ({
                ...v,
                id: i + 1,
                // RAW text - no cleaning here, compliance filter handles this
                headline: v.headline || '',
                subheadline: v.subheadline || '',
                // Fallback colors if AI doesn't provide them
                backgroundColor: v.backgroundColor || backgrounds.solid[i % backgrounds.solid.length] || productAnalysis.suggestedBackground,
                headlineColor: v.textColor || productAnalysis.suggestedTextColor || '#ffffff',
                accentColor: v.accentColor || productAnalysis.suggestedAccent || '#e51c23',
                // Ensure layout exists
                layout: v.layout || {
                    packshot: { x: 0.5, y: 0.5, scale: 1.0 },
                    headline: { x: 0.5, y: 0.25, align: 'center' },
                    subheadline: { x: 0.5, y: 0.35, align: 'center' },
                    valueTile: { x: 0.5, y: 0.8 },
                    tag: { x: 0.5, y: 0.95 }
                },
                // Track compliance status (will be filled by compliance filter)
                complianceStatus: null
            }));
        }

        // Ensure we always have 5 variants (fallback if AI didn't generate enough)
        while (variants.length < 5) {
            const fallbackVariants = [
                { headline: 'Discover More', subheadline: 'Only at Tesco', tone: 'friendly', priceType: 'clubcard' },
                { headline: 'Great Value', subheadline: 'Quality you can trust', tone: 'confident', priceType: 'white' },
                { headline: 'Try Something New', subheadline: 'Available now', tone: 'curious', priceType: 'new' },
                { headline: 'Taste The Difference', subheadline: 'Premium quality', tone: 'premium', priceType: 'clubcard' },
                { headline: 'Your Favourite', subheadline: 'Back in stock', tone: 'warm', priceType: 'white' },
            ];
            const fb = fallbackVariants[variants.length];
            variants.push({
                id: variants.length + 1,
                ...fb,
                tag: 'Only at Tesco',
                backgroundColor: backgrounds.solid[variants.length % backgrounds.solid.length],
                headlineColor: productAnalysis.suggestedTextColor || '#ffffff',
                accentColor: productAnalysis.suggestedAccent || '#e51c23',
                layout: {
                    packshot: { x: 0.5, y: 0.5, scale: 1.0 },
                    headline: { x: 0.5, y: 0.25, align: 'center' },
                    subheadline: { x: 0.5, y: 0.35, align: 'center' },
                    valueTile: { x: 0.5, y: 0.8 },
                    tag: { x: 0.5, y: 0.95 }
                },
                complianceStatus: null
            });
        }

        const generationTime = Date.now() - startTime;

        return {
            success: true,
            generationTimeMs: generationTime,
            product: productAnalysis,
            backgrounds,
            variants: variants.slice(0, 5),
            isAlcohol: productAnalysis.isAlcohol,
            // Mark that compliance check is pending
            complianceChecked: false
        };
    } catch (error) {
        console.error('Creative spec generation failed:', error);
        return getFallbackCreativeSpec(productAnalysis, backgrounds);
    }
}

/**
 * Fallback creative spec when AI fails
 */
function getFallbackCreativeSpec(productAnalysis, backgrounds) {
    const variants = [
        { id: 1, tone: 'bold', headline: 'Discover Today', subheadline: 'Only at Tesco', priceType: 'clubcard' },
        { id: 2, tone: 'friendly', headline: 'Great Value', subheadline: 'Quality guaranteed', priceType: 'white' },
        { id: 3, tone: 'minimal', headline: 'Simply Good', subheadline: 'Taste the difference', priceType: 'new' },
        { id: 4, tone: 'premium', headline: 'Treat Yourself', subheadline: 'You deserve this', priceType: 'clubcard' },
        { id: 5, tone: 'playful', headline: 'Why Wait?', subheadline: 'Get yours now', priceType: 'white' },
    ].map((v, i) => ({
        ...v,
        tag: 'Only at Tesco',
        backgroundColor: backgrounds.solid[i % backgrounds.solid.length],
        accentColor: productAnalysis.suggestedAccent || '#e51c23',
        headlineColor: productAnalysis.suggestedTextColor || '#ffffff',
        layout: {
            packshot: { x: 0.5, y: 0.5, scale: 1.0 },
            headline: { x: 0.5, y: 0.25, align: 'center' },
            subheadline: { x: 0.5, y: 0.35, align: 'center' },
            valueTile: { x: 0.5, y: 0.8 },
            tag: { x: 0.5, y: 0.95 }
        },
        complianceStatus: null
    }));

    return {
        success: true,
        generationTimeMs: 100,
        product: productAnalysis,
        backgrounds,
        variants,
        isAlcohol: productAnalysis.isAlcohol || false,
        complianceChecked: false
    };
}

/**
 * Demo creative spec for showcase/testing
 * Returns pre-designed creative variants for Coca-Cola Zero
 */
function getDemoCreativeSpec(startTime, userPrompt = '') {
    const product = {
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

    const backgrounds = {
        solid: ['#1a1a1a', '#0d0d0d', '#1a0f0f', '#000000', '#1c1c1c'],
        gradients: ['linear-gradient(135deg, #1a1a1a 0%, #e51c23 100%)'],
        recommended: '#1a1a1a'
    };

    // Creative variants - these simulate what AI would generate
    const variants = [
        {
            id: 1,
            tone: 'bold',
            headline: 'Zero Sugar, Full Taste',
            subheadline: 'The refreshing choice you deserve',
            tag: 'Only at Tesco',
            priceType: 'clubcard',
            backgroundColor: '#1a1a1a',
            headlineColor: '#ffffff',
            accentColor: '#e51c23',
            layout: {
                packshot: { x: 0.5, y: 0.55, scale: 1.0 },
                headline: { x: 0.5, y: 0.18, align: 'center', width: 0.85 },
                subheadline: { x: 0.5, y: 0.28, align: 'center', width: 0.75 },
                valueTile: { x: 0.5, y: 0.85 },
                tag: { x: 0.5, y: 0.95 }
            },
            complianceStatus: null
        },
        {
            id: 2,
            tone: 'playful',
            headline: 'Refresh Your Day',
            subheadline: 'Same great taste, zero calories',
            tag: 'Available at Tesco',
            priceType: 'white',
            backgroundColor: '#0d0d0d',
            headlineColor: '#ffffff',
            accentColor: '#e51c23',
            layout: {
                packshot: { x: 0.6, y: 0.5, scale: 0.9 },
                headline: { x: 0.3, y: 0.25, align: 'left', width: 0.5 },
                subheadline: { x: 0.3, y: 0.35, align: 'left', width: 0.45 },
                valueTile: { x: 0.3, y: 0.75 },
                tag: { x: 0.5, y: 0.95 }
            },
            complianceStatus: null
        },
        {
            id: 3,
            tone: 'minimal',
            headline: 'Just Coke. Zero Sugar.',
            subheadline: 'Nothing more, nothing less',
            tag: 'Only at Tesco',
            priceType: 'new',
            backgroundColor: '#000000',
            headlineColor: '#e51c23',
            accentColor: '#ffffff',
            layout: {
                packshot: { x: 0.5, y: 0.6, scale: 1.1 },
                headline: { x: 0.5, y: 0.15, align: 'center', width: 0.9 },
                subheadline: { x: 0.5, y: 0.25, align: 'center', width: 0.7 },
                valueTile: { x: 0.5, y: 0.88 },
                tag: { x: 0.5, y: 0.96 }
            },
            complianceStatus: null
        },
        {
            id: 4,
            tone: 'premium',
            headline: 'Elevate Every Moment',
            subheadline: 'The iconic taste, reimagined',
            tag: 'Clubcard Price',
            priceType: 'clubcard',
            backgroundColor: '#1a0f0f',
            headlineColor: '#ffffff',
            accentColor: '#e51c23',
            layout: {
                packshot: { x: 0.4, y: 0.5, scale: 0.95 },
                headline: { x: 0.7, y: 0.3, align: 'right', width: 0.5 },
                subheadline: { x: 0.7, y: 0.4, align: 'right', width: 0.45 },
                valueTile: { x: 0.7, y: 0.7 },
                tag: { x: 0.5, y: 0.95 }
            },
            complianceStatus: null
        },
        {
            id: 5,
            tone: 'friendly',
            headline: 'Share The Feeling',
            subheadline: 'Perfect for family moments',
            tag: 'Only at Tesco',
            priceType: 'white',
            backgroundColor: '#1c1c1c',
            headlineColor: '#ffffff',
            accentColor: '#e51c23',
            layout: {
                packshot: { x: 0.5, y: 0.52, scale: 1.0 },
                headline: { x: 0.5, y: 0.2, align: 'center', width: 0.8 },
                subheadline: { x: 0.5, y: 0.3, align: 'center', width: 0.7 },
                valueTile: { x: 0.5, y: 0.83 },
                tag: { x: 0.5, y: 0.95 }
            },
            complianceStatus: null
        }
    ];

    const generationTime = Date.now() - startTime;

    return {
        success: true,
        generationTimeMs: generationTime,
        product,
        backgrounds,
        variants,
        isAlcohol: false,
        complianceChecked: false,
        isDemo: true
    };
}

export default {
    generateCreativeSpec
};
