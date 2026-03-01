// Gemini AI Service for AstraCreate
// Enhanced with compliance-aware campaign generation and image analysis

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// COMPLIANCE RULES - Must avoid these in AI-generated content
const PROHIBITED_TERMS = [
  'free', 'gratis', 'win', 'winner', 'winning', 'prize', 'competition', 'contest', 'giveaway', 'raffle', 'lottery',
  'money back', 'money-back', 'refund', 'guarantee', 'guaranteed',
  'sustainable', 'sustainability', 'eco-friendly', 'green', 'carbon neutral', 'organic', 'recyclable', 'biodegradable',
  'best ever', '#1', 'number one', 'award winning', 'clinically proven', 'scientifically proven',
  'terms and conditions', 't&c', 'terms apply',
  'survey', 'research shows', 'studies show',
  'charity', 'donate', 'donation', 'fundraising',
];

// Validate text doesn't contain prohibited terms
export function validateCompliance(text) {
  const lowerText = text.toLowerCase();
  const violations = PROHIBITED_TERMS.filter(term => lowerText.includes(term.toLowerCase()));
  return { isValid: violations.length === 0, violations };
}

// Clean text by removing/replacing prohibited terms
function cleanText(text) {
  let cleaned = text;
  cleaned = cleaned.replace(/sugar[\s-]?free/gi, 'Zero Sugar');
  cleaned = cleaned.replace(/fat[\s-]?free/gi, 'Low Fat');
  cleaned = cleaned.replace(/guilt[\s-]?free/gi, 'Light');
  cleaned = cleaned.replace(/free[\s-]?range/gi, 'Farm Fresh');
  cleaned = cleaned.replace(/\bfree\b/gi, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

class GeminiService {
  constructor() {
    // Multiple API keys for rotation (fallback chain)
    this.apiKeys = [
      import.meta.env.VITE_GEMINI_API_KEY || '',
      'AIzaSyCX6re2Getee5d41bSgqq6hD4vv7_iKw6U',
      'AIzaSyAF36tTdOw5YoEoSy4btwZh6Rr6PuiFjvo',
      'AIzaSyC6wrBqwBypRux22LcaBsZjyCKuGX4UTA8',
    ].filter(key => key && key.length > 10);

    this.currentKeyIndex = 0;
    this.keyFailures = {}; // Track failures per key
    this.lastKeyRotation = Date.now();

    // Backoff settings
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 10000; // 10 seconds
  }

  get apiKey() {
    return this.apiKeys[this.currentKeyIndex] || this.apiKeys[0] || '';
  }

  setApiKey(key) {
    if (key && key.length > 10) {
      // Add to front of keys array if not already present
      if (!this.apiKeys.includes(key)) {
        this.apiKeys.unshift(key);
      }
      this.currentKeyIndex = this.apiKeys.indexOf(key);
      localStorage.setItem('gemini_api_key', key);
    }
  }

  hasApiKey() {
    return this.apiKeys.length > 0 && this.apiKey.length > 10;
  }

  // Rotate to next available key
  rotateKey() {
    const previousKey = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    this.lastKeyRotation = Date.now();
    console.log(`🔄 API Key rotated: ${previousKey} → ${this.currentKeyIndex} (of ${this.apiKeys.length} keys)`);
    return this.currentKeyIndex !== previousKey;
  }

  // Exponential backoff delay
  getBackoffDelay(attempt) {
    const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Core API call with retry and key rotation
  async callGeminiWithRetry(requestFn, context = 'API call') {
    let lastError = null;
    const startKeyIndex = this.currentKeyIndex;
    let keysAttempted = 0;

    while (keysAttempted < this.apiKeys.length) {
      // Try current key with exponential backoff
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          const result = await requestFn(this.apiKey);
          // Success - reset failure count for this key
          this.keyFailures[this.currentKeyIndex] = 0;
          return result;
        } catch (error) {
          lastError = error;
          const isRateLimit = error.message?.includes('429') ||
            error.message?.includes('quota') ||
            error.message?.includes('rate limit') ||
            error.status === 429;

          console.warn(`⚠️ ${context} attempt ${attempt + 1}/${this.maxRetries} failed:`, error.message);

          if (isRateLimit && attempt < this.maxRetries - 1) {
            // Rate limit - use exponential backoff
            const delay = this.getBackoffDelay(attempt);
            console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          } else if (!isRateLimit) {
            // Non-rate-limit error - don't retry, throw immediately
            throw error;
          }
        }
      }

      // All retries exhausted for this key - rotate to next
      this.keyFailures[this.currentKeyIndex] = (this.keyFailures[this.currentKeyIndex] || 0) + 1;
      console.log(`❌ Key ${this.currentKeyIndex} exhausted after ${this.maxRetries} retries`);

      if (this.rotateKey()) {
        keysAttempted++;
        console.log(`🔑 Trying next key (${keysAttempted}/${this.apiKeys.length})...`);
      } else {
        break; // No more keys to try
      }
    }

    // All keys exhausted
    console.error(`💀 All ${this.apiKeys.length} API keys exhausted`);
    throw lastError || new Error('All API keys exhausted');
  }

  async callGemini(prompt, options = {}) {
    if (!this.hasApiKey()) throw new Error('No API key configured');

    return this.callGeminiWithRetry(async (apiKey) => {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 1024,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }, 'callGemini');
  }

  // Multimodal call (text + image) for vision tasks
  async callGeminiVision(prompt, imageBase64, mimeType = 'image/jpeg') {
    if (!this.hasApiKey()) throw new Error('No API key configured');

    return this.callGeminiWithRetry(async (apiKey) => {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Vision API request failed (${response.status}): ${errorText}`);
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }, 'callGeminiVision');
  }

  // ============================================
  // PEOPLE DETECTION (Appendix B Compliance)
  // ============================================

  async detectPeopleInImage(imageDataUrl) {
    try {
      const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!base64Match) return { containsPeople: false, confidence: 0 };

      const mimeType = `image/${base64Match[1] === 'jpg' ? 'jpeg' : base64Match[1]}`;
      const base64Data = base64Match[2];

      const prompt = `Analyze this image. Does it contain any people (humans, faces, silhouettes)?
      
Respond ONLY with JSON:
{"containsPeople": true/false, "confidence": 0.0-1.0, "description": "brief note"}`;

      const result = await this.callGeminiVision(prompt, base64Data, mimeType);

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          containsPeople: parsed.containsPeople === true,
          confidence: parsed.confidence || 0,
          description: parsed.description || '',
        };
      }

      const lowerResult = result.toLowerCase();
      const containsPeople = lowerResult.includes('yes') || lowerResult.includes('person') || lowerResult.includes('people');
      return { containsPeople, confidence: containsPeople ? 0.7 : 0.3 };

    } catch (error) {
      console.error('People detection failed:', error);
      return { containsPeople: false, confidence: 0, error: error.message };
    }
  }

  // ============================================
  // AUTONOMOUS PRODUCT ANALYSIS (NEW!)
  // ============================================

  /**
   * Analyze a product image to extract product name, category, and brand colors
   * This is the core of autonomous creative generation
   */
  async analyzeProductImage(imageDataUrl) {
    try {
      const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!base64Match) {
        return this.getFallbackProductAnalysis();
      }

      const mimeType = `image/${base64Match[1] === 'jpg' ? 'jpeg' : base64Match[1]}`;
      const base64Data = base64Match[2];

      const prompt = `You are a retail product analyst. Analyze this product image and extract information.

Identify:
1. Product name (brand + product type + size if visible)
2. Product category from: Food & Drink, Alcohol, Health & Beauty, Household, Baby, Pet, Bakery, Frozen, Fresh
3. Brand name
4. Dominant colors in the packaging (up to 5 hex codes)
5. Whether this is an alcohol product
6. Suggested background color that would complement this product

Respond ONLY with JSON:
{
  "productName": "Full product name",
  "brand": "Brand name",
  "category": "Category from list above",
  "isAlcohol": true/false,
  "packagingColors": ["#hex1", "#hex2", "#hex3"],
  "dominantColor": "#hex",
  "suggestedBackground": "#hex",
  "suggestedAccent": "#hex",
  "suggestedTextColor": "#hex",
  "confidence": 0.0-1.0
}`;

      const result = await this.callGeminiVision(prompt, base64Data, mimeType);

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          ...parsed,
          packagingColors: parsed.packagingColors || ['#e51c23', '#ffffff', '#003d7a'],
        };
      }

      return this.getFallbackProductAnalysis();
    } catch (error) {
      console.error('Product analysis failed:', error);
      return this.getFallbackProductAnalysis();
    }
  }

  getFallbackProductAnalysis() {
    return {
      success: false,
      productName: 'Your Product',
      brand: 'Brand',
      category: 'Food & Drink',
      isAlcohol: false,
      packagingColors: ['#e51c23', '#ffffff', '#003d7a'],
      dominantColor: '#e51c23',
      suggestedBackground: '#1a1a2e',
      suggestedAccent: '#e51c23',
      suggestedTextColor: '#ffffff',
      confidence: 0.3,
    };
  }

  /**
   * Extract brand colors from a logo or product image
   */
  async extractBrandColors(imageDataUrl) {
    try {
      const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!base64Match) return { colors: ['#003d7a', '#e51c23', '#ffffff'] };

      const mimeType = `image/${base64Match[1] === 'jpg' ? 'jpeg' : base64Match[1]}`;
      const base64Data = base64Match[2];

      const prompt = `Extract the main brand colors from this image. 
Return ONLY JSON with hex color codes:
{"colors": ["#primary", "#secondary", "#accent", "#background", "#text"], "palette": "warm/cool/neutral"}`;

      const result = await this.callGeminiVision(prompt, base64Data, mimeType);

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { colors: ['#003d7a', '#e51c23', '#ffffff'], palette: 'neutral' };
    } catch (error) {
      console.error('Color extraction failed:', error);
      return { colors: ['#003d7a', '#e51c23', '#ffffff'], palette: 'neutral' };
    }
  }

  /**
   * Generate background suggestions based on product category and mood
   */
  generateBackgroundSuggestions(category, mood = 'modern') {
    const backgrounds = {
      'Food & Drink': {
        modern: ['#1a1a2e', '#2d3436', '#0a0a0a'],
        warm: ['#8b4513', '#a0522d', '#cd853f'],
        fresh: ['#2d5a3d', '#1e8449', '#27ae60'],
        gradients: [
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          'linear-gradient(180deg, #2d5a3d 0%, #1a472a 100%)',
        ]
      },
      'Alcohol': {
        modern: ['#1a1a2e', '#0f0f23', '#1c1c3c'],
        warm: ['#2c1810', '#3d2314', '#4a2c17'],
        premium: ['#1a1a1a', '#0d0d0d', '#2d2d2d'],
        gradients: [
          'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
          'linear-gradient(180deg, #2c1810 0%, #1a0f0a 100%)',
        ]
      },
      'Health & Beauty': {
        modern: ['#f5e6e0', '#fff5f5', '#fef6f6'],
        fresh: ['#e8f5e9', '#f1f8f2', '#e3f2fd'],
        clean: ['#ffffff', '#fafafa', '#f5f5f5'],
        gradients: [
          'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
          'linear-gradient(180deg, #a8edea 0%, #fed6e3 100%)',
        ]
      },
      'Household': {
        modern: ['#e8f4f8', '#f0f8ff', '#e3f2fd'],
        clean: ['#ffffff', '#fafafa', '#f5f5f5'],
        fresh: ['#e8f5e9', '#e0f7fa', '#e3f2fd'],
        gradients: [
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          'linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)',
        ]
      },
      'Baby': {
        modern: ['#fff5f5', '#fef6f9', '#fff0f5'],
        soft: ['#fce4ec', '#f8bbd9', '#ffebee'],
        neutral: ['#fafafa', '#f5f5f5', '#eeeeee'],
        gradients: [
          'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
          'linear-gradient(180deg, #ff9a9e 0%, #fecfef 100%)',
        ]
      },
      'Pet': {
        modern: ['#f0f8e8', '#e8f5e9', '#dcedc8'],
        warm: ['#fff8e1', '#ffecb3', '#ffe082'],
        nature: ['#e8f5e9', '#c8e6c9', '#a5d6a7'],
        gradients: [
          'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          'linear-gradient(180deg, #f5af19 0%, #f12711 100%)',
        ]
      },
    };

    const categoryBgs = backgrounds[category] || backgrounds['Food & Drink'];
    const moodBgs = categoryBgs[mood] || categoryBgs.modern || categoryBgs[Object.keys(categoryBgs)[0]];

    return {
      solid: moodBgs,
      gradients: categoryBgs.gradients || [],
      recommended: moodBgs[0],
    };
  }

  // ============================================
  // AUTONOMOUS CREATIVE GENERATION (CORE FEATURE!)
  // ============================================

  /**
   * Generate complete creative variants autonomously from a single product image
   * This is the "Magic Wand" feature - minimal input, maximum output
   */
  /**
   * Generate complete creative variants autonomously from a single product image
   * This is the "Magic Wand" feature - minimal input, maximum output
   */
  async generateAutonomousCreative(imageDataUrl, options = {}) {
    const startTime = Date.now();
    const { userPrompt = '', mood = 'modern' } = options;

    // Step 1: Analyze the product image
    const productAnalysis = await this.analyzeProductImage(imageDataUrl);

    // Step 2: Generate background suggestions
    const backgrounds = this.generateBackgroundSuggestions(
      productAnalysis.category,
      mood
    );

    // Step 3: Generate multiple headline variants with dynamic layouts
    const prompt = `You are a creative director generating retail ad variants for Tesco UK.
    
Product: ${productAnalysis.productName}
Brand: ${productAnalysis.brand}
Category: ${productAnalysis.category}
${productAnalysis.isAlcohol ? '⚠️ ALCOHOL PRODUCT - Must include Drinkaware lockup' : ''}

User Creative Direction: "${userPrompt}"
(If empty, generate diverse high-performing retail ads)

Generate 5 DIFFERENT creative variants.
For each variant, define the COPY and the LAYOUT COORDINATES.

⚠️ CRITICAL COMPLIANCE RULES - NEVER USE:
- "free" (use "zero sugar", "low fat" instead)
- "win", "prize", "competition", "giveaway"
- "guarantee", "money back"
- "sustainable", "eco-friendly", "organic", "green"
- "#1", "best ever", "award winning"
- asterisks (*) or claims

Return ONLY JSON:
{
  "variants": [
    {
      "id": 1,
      "tone": "bold/friendly/premium/minimal/playful",
      "headline": "Headline (MAX 35 CHARACTERS)",
      "subheadline": "5-10 word subheadline",
      "tag": "Only at Tesco",
      "priceType": "clubcard/white/new",
      "backgroundColor": "#hex",
      "textColor": "#hex",
      "accentColor": "#hex",
      "layout": {
        "packshot": { "x": 0.5, "y": 0.5, "scale": 1.0 },
        "headline": { "x": 0.5, "y": 0.2, "align": "center", "width": 0.8 },
        "subheadline": { "x": 0.5, "y": 0.3, "align": "center", "width": 0.7 },
        "valueTile": { "x": 0.8, "y": 0.8 },
        "tag": { "x": 0.5, "y": 0.95 }
      }
    }
  ]
}

Layout Coordinate System:
- x, y: 0.0 to 1.0 (percentage of canvas width/height)
- x=0.5, y=0.5 is center
- scale: relative to standard size (1.0 = normal)
`;

    try {
      const result = await this.callGemini(prompt, { temperature: 0.9, maxTokens: 4096 });

      let variants = [];
      const jsonMatch = result.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        variants = (parsed.variants || []).map((v, i) => ({
          ...v,
          id: i + 1,
          headline: cleanText(v.headline),
          subheadline: cleanText(v.subheadline || ''),
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
          }
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
          }
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
      };
    } catch (error) {
      console.error('Autonomous generation failed:', error);
      return this.getFallbackAutonomousCreative(productAnalysis, backgrounds);
    }
  }

  getFallbackAutonomousCreative(productAnalysis, backgrounds) {
    const variants = [
      { id: 1, tone: 'bold', headline: 'Discover Today', subheadline: 'Only at Tesco', priceType: 'clubcard', mood: 'energetic' },
      { id: 2, tone: 'friendly', headline: 'Great Value', subheadline: 'Quality guaranteed', priceType: 'white', mood: 'warm' },
      { id: 3, tone: 'minimal', headline: 'Simply Good', subheadline: 'Taste the difference', priceType: 'new', mood: 'calm' },
      { id: 4, tone: 'premium', headline: 'Treat Yourself', subheadline: 'You deserve this', priceType: 'clubcard', mood: 'premium' },
      { id: 5, tone: 'playful', headline: 'Why Wait?', subheadline: 'Get yours now', priceType: 'white', mood: 'playful' },
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
      }
    }));

    return {
      success: true,
      generationTimeMs: 100,
      product: productAnalysis,
      backgrounds,
      variants,
      isAlcohol: productAnalysis.isAlcohol || false,
    };
  }

  // ============================================
  // SMART LAYOUT SUGGESTIONS
  // ============================================

  /**
   * Get AI suggestions for optimal element positioning
   */
  async suggestOptimalLayout(elements, format) {
    const elementDescriptions = elements.map(e => ({
      type: e.type,
      name: e.customName || e.type,
      isPackshot: e.isPackshot,
      isHeadline: e.fontSize >= 48,
      isValueTile: e.isValueTile,
    }));

    // For performance, use rule-based suggestions instead of API call
    const formatRules = {
      'instagram-feed': {
        packshot: { x: 0.5, y: 0.52, maxScale: 0.45 },
        headline: { x: 0.5, y: 0.25, maxWidth: 0.85 },
        subheadline: { x: 0.5, y: 0.38, maxWidth: 0.75 },
        valueTile: { x: 0.5, y: 0.82 },
        tag: { x: 0.5, y: 0.95 },
      },
      'instagram-story': {
        packshot: { x: 0.5, y: 0.45, maxScale: 0.40 },
        headline: { x: 0.5, y: 0.22, maxWidth: 0.80 },
        subheadline: { x: 0.5, y: 0.32, maxWidth: 0.70 },
        valueTile: { x: 0.5, y: 0.70 },
        tag: { x: 0.5, y: 0.88 },
      },
      'facebook-feed': {
        packshot: { x: 0.35, y: 0.50, maxScale: 0.50 },
        headline: { x: 0.70, y: 0.35, maxWidth: 0.55 },
        subheadline: { x: 0.70, y: 0.50, maxWidth: 0.50 },
        valueTile: { x: 0.70, y: 0.70 },
        tag: { x: 0.5, y: 0.92 },
      },
      'facebook-story': {
        packshot: { x: 0.5, y: 0.45, maxScale: 0.40 },
        headline: { x: 0.5, y: 0.22, maxWidth: 0.80 },
        subheadline: { x: 0.5, y: 0.32, maxWidth: 0.70 },
        valueTile: { x: 0.5, y: 0.70 },
        tag: { x: 0.5, y: 0.88 },
      },
    };

    return {
      format,
      rules: formatRules[format] || formatRules['instagram-feed'],
      suggestions: [
        'Keep packshot as the visual anchor',
        'Headline should have maximum contrast',
        'Value tile should be immediately visible',
        'Maintain safe zones for social UI overlays',
      ],
    };
  }

  // ============================================
  // COPY GENERATION (Compliance-Aware)
  // ============================================

  async generateCopySuggestions({ productName, tone = 'friendly', format = 'instagram-feed' }) {
    const prompt = `You are a creative copywriter for Tesco UK retail campaigns. Generate 3 headline options for a social media ad.

Product: ${productName}
Tone: ${tone}
Format: ${format}

⚠️ CRITICAL COMPLIANCE RULES (Appendix B) - NEVER USE THESE WORDS:
- "free" (including "sugar-free", "fat-free", "guilt-free" - use "zero sugar", "low fat" instead)
- "win", "winner", "prize", "competition", "giveaway"
- "guarantee", "guaranteed", "money back"
- "sustainable", "eco-friendly", "organic", "green"
- "best ever", "#1", "number one", "award winning"
- "charity", "donate"
- ANY asterisks (*) or claims

✅ INSTEAD USE:
- "Zero Sugar" not "Sugar Free"
- "Low Fat" not "Fat Free"  
- "Great Value" not "Best Value"
- Focus on taste, convenience, quality

- "Great Value" not "Best Value"
- Focus on taste, convenience, quality

Keep headlines SHORT (MAX 35 CHARACTERS). NO prices (use Value Tiles for that).

Return JSON only:
{
  "suggestions": [
    {"headline": "...", "subheadline": "...", "reasoning": "..."},
    {"headline": "...", "subheadline": "...", "reasoning": "..."},
    {"headline": "...", "subheadline": "...", "reasoning": "..."}
  ]
}`;

    try {
      const result = await this.callGemini(prompt);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsed.suggestions = parsed.suggestions.map(s => ({
          ...s,
          headline: cleanText(s.headline),
          subheadline: cleanText(s.subheadline || ''),
        }));
        return parsed;
      }
      return { suggestions: [] };
    } catch (e) {
      console.error('Copy generation failed:', e);
      return { suggestions: [] };
    }
  }

  // ============================================
  // COMPLETE CAMPAIGN GENERATION
  // ============================================

  async generateCompleteCampaign({ productName, category, priceType, price, regularPrice, endDate }) {
    const prompt = `You are a senior creative director for Tesco UK. Generate a complete ad campaign layout.

Product: ${productName}
Category: ${category || 'Food & Drink'}
Price Type: ${priceType} (new/white/clubcard)
${price ? `Offer Price: ${price}` : ''}
${regularPrice ? `Was Price: ${regularPrice}` : ''}
${endDate ? `Ends: ${endDate}` : ''}

⚠️ CRITICAL COMPLIANCE RULES - YOUR OUTPUT WILL BE REJECTED IF YOU USE:
❌ NEVER USE: "free" (including compound words like "sugar-free", "fat-free", "guilt-free")
❌ NEVER USE: "win", "prize", "competition", "giveaway", "raffle"
❌ NEVER USE: "guarantee", "money back", "refund"
❌ NEVER USE: "sustainable", "eco-friendly", "organic", "green", "carbon"
❌ NEVER USE: "best", "#1", "award winning", "clinically proven"
❌ NEVER USE: asterisks (*), claims, or survey references
❌ NEVER USE: "charity", "donate", "fundraising"

✅ SAFE ALTERNATIVES:
- "Zero Sugar" instead of "Sugar Free"
- "Low Fat" instead of "Fat Free"
- "Great Taste" instead of "Best Taste"
- "Fresh" instead of "Organic"

Generate:
1. Primary headline (MAX 35 CHARACTERS, punchy, COMPLIANT)
2. Subheadline (5-10 words, COMPLIANT)
3. Background color (hex) complementing the product
4. Layout suggestions

Return JSON:
{
  "campaign": {
    "headline": "...",
    "subheadline": "...",
    "backgroundColor": "#XXXXXX",
    "accentColor": "#XXXXXX",
    "headlineColor": "#XXXXXX",
    "tone": "..."
  }
}`;

    try {
      const result = await this.callGemini(prompt, { temperature: 0.8, maxTokens: 2048 });
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.campaign) {
          parsed.campaign.headline = cleanText(parsed.campaign.headline);
          parsed.campaign.subheadline = cleanText(parsed.campaign.subheadline || '');

          const validation = validateCompliance(parsed.campaign.headline + ' ' + parsed.campaign.subheadline);
          if (!validation.isValid) {
            return this.getFallbackCampaign(productName, category, priceType);
          }
        }

        parsed.campaign.layouts = {
          // Social Media
          'instagram-feed': { headlineY: 0.3, packY: 0.55, tileY: 0.85 },
          'instagram-story': { headlineY: 0.35, packY: 0.5, tileY: 0.75 },
          'facebook-feed': { headlineY: 0.25, packY: 0.5, tileY: 0.85 },
          'facebook-story': { headlineY: 0.35, packY: 0.5, tileY: 0.75 },
          // Display Advertising
          'display-banner': { headlineY: 0.50, packY: 0.50, tileY: 0.50, fontSize: { headline: 24, sub: 14 }, horizontal: true },
          'display-mpu': { headlineY: 0.25, packY: 0.55, tileY: 0.85, fontSize: { headline: 32, sub: 18 } },
          // In-Store Point of Sale
          'pos-portrait': { headlineY: 0.15, packY: 0.48, tileY: 0.78, fontSize: { headline: 80, sub: 40 } },
          'pos-landscape': { headlineY: 0.35, packY: 0.50, tileY: 0.85, fontSize: { headline: 72, sub: 36 }, horizontal: true },
        };

        return parsed;
      }

      return this.getFallbackCampaign(productName, category, priceType);
    } catch (e) {
      console.error('Campaign generation failed:', e);
      return this.getFallbackCampaign(productName, category, priceType);
    }
  }

  getFallbackCampaign(productName, category, priceType) {
    const categoryStyles = {
      'Food & Drink': { bg: '#2d5a3d', accent: '#e51c23', headline: '#ffffff' },
      'Alcohol': { bg: '#1a1a2e', accent: '#d4af37', headline: '#ffffff' },
      'Health & Beauty': { bg: '#f5e6e0', accent: '#c44569', headline: '#333333' },
      'Household': { bg: '#e8f4f8', accent: '#3498db', headline: '#1a1a1a' },
      'Baby': { bg: '#fff5f5', accent: '#ff6b9d', headline: '#333333' },
      'Pet': { bg: '#f0f8e8', accent: '#27ae60', headline: '#1a1a1a' },
    };

    const style = categoryStyles[category] || categoryStyles['Food & Drink'];

    const headlines = {
      new: [`Discover ${productName.split(' ')[0]}`, `Try Something New`, `Just Arrived`],
      white: [`Great Value`, `Quality Choice`, `Everyday Favourite`],
      clubcard: [`Clubcard Price`, `Members Save More`, `Exclusive Offer`],
    };

    const subheadlines = {
      new: 'Now at Tesco',
      white: 'Quality you can trust',
      clubcard: 'Clubcard exclusive savings',
    };

    const selectedHeadline = headlines[priceType]?.[0] || `Discover More`;

    return {
      campaign: {
        headline: selectedHeadline,
        subheadline: subheadlines[priceType] || 'Only at Tesco',
        backgroundColor: style.bg,
        accentColor: style.accent,
        headlineColor: style.headline,
        tone: 'friendly',
        layouts: {
          'instagram-feed': { headlineY: 0.3, packY: 0.55, tileY: 0.85 },
          'instagram-story': { headlineY: 0.35, packY: 0.5, tileY: 0.75 },
          'facebook-feed': { headlineY: 0.25, packY: 0.5, tileY: 0.85 }
        }
      },
      variants: [
        { headline: headlines[priceType]?.[1] || 'Quality Guaranteed', subheadline: 'Available in store & online' },
        { headline: headlines[priceType]?.[2] || 'Shop Now', subheadline: 'Exclusive to Tesco' }
      ]
    };
  }

  // ============================================
  // DEMO CAMPAIGN (Guaranteed Compliant)
  // ============================================

  getDemoCampaign() {
    return {
      product: {
        name: 'Coca-Cola Zero Sugar 2L',
        category: 'Food & Drink',
        priceType: 'clubcard',
        price: '£1.75',
        regularPrice: '£2.50',
        endDate: '24/12'
      },
      campaign: {
        headline: 'Zero Sugar, Full Taste',
        subheadline: 'The refreshing choice',
        backgroundColor: '#1a1a1a',
        accentColor: '#e51c23',
        headlineColor: '#ffffff',
        tone: 'bold',
        layouts: {
          'instagram-feed': { headlineY: 0.28, packY: 0.52, tileY: 0.82 },
          'instagram-story': { headlineY: 0.32, packY: 0.48, tileY: 0.72 },
          'facebook-feed': { headlineY: 0.22, packY: 0.48, tileY: 0.82 }
        }
      },
      variants: [
        { headline: 'Taste The Difference', subheadline: 'Zero calories, maximum flavour' },
        { headline: 'Refresh Your Day', subheadline: 'Clubcard exclusive' }
      ]
    };
  }

  validateText(text) {
    return validateCompliance(text);
  }

  cleanProhibitedTerms(text) {
    return cleanText(text);
  }
}

const geminiService = new GeminiService();
export default geminiService;
