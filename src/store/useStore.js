import { create } from 'zustand';

// Social Media Format Presets (8 formats for multi-channel creative)
export const FORMAT_PRESETS = {
    // Social Media
    'instagram-feed': {
        width: 1080, height: 1080, name: 'Instagram Feed', ratio: '1:1', category: 'social',
        config: { valueTileScale: 1.5, headlineFontSize: 72, subFontSize: 48, packshotScale: 0.5, layout: 'vertical' }
    },
    'instagram-story': {
        width: 1080, height: 1920, name: 'Instagram Story', ratio: '9:16', category: 'social',
        config: { valueTileScale: 1.8, headlineFontSize: 96, subFontSize: 56, packshotScale: 0.6, layout: 'vertical' }
    },
    'facebook-feed': {
        width: 1200, height: 628, name: 'Facebook Feed', ratio: '1.91:1', category: 'social',
        config: { valueTileScale: 1.2, headlineFontSize: 60, subFontSize: 36, packshotScale: 0.45, layout: 'vertical' }
    },
    'facebook-story': {
        width: 1080, height: 1920, name: 'Facebook Story', ratio: '9:16', category: 'social',
        config: { valueTileScale: 1.8, headlineFontSize: 96, subFontSize: 56, packshotScale: 0.6, layout: 'vertical' }
    },
    // Display Advertising
    'display-banner': {
        width: 728, height: 90, name: 'Display Banner', ratio: '8.09:1', category: 'display',
        config: { valueTileScale: 0.6, headlineFontSize: 24, subFontSize: 14, packshotScale: 0.8, layout: 'horizontal' }
    },
    'display-mpu': {
        width: 300, height: 250, name: 'Display MPU', ratio: '1.2:1', category: 'display',
        config: { valueTileScale: 0.7, headlineFontSize: 28, subFontSize: 18, packshotScale: 0.5, layout: 'vertical' }
    },
    // In-Store Point of Sale
    'pos-portrait': {
        width: 420, height: 594, name: 'In-Store POS Portrait', ratio: '0.71:1', category: 'instore',
        config: { valueTileScale: 1.0, headlineFontSize: 48, subFontSize: 32, packshotScale: 0.6, layout: 'vertical' }
    },
    'pos-landscape': {
        width: 594, height: 420, name: 'In-Store POS Landscape', ratio: '1.41:1', category: 'instore',
        config: { valueTileScale: 1.0, headlineFontSize: 48, subFontSize: 32, packshotScale: 0.5, layout: 'horizontal' }
    },
};

// Creative Profiles - Mode-based constraint system
export const CREATIVE_PROFILES = {
    STANDARD: {
        id: 'STANDARD',
        name: 'Standard',
        icon: '🎨',
        description: 'Full creative freedom with compliance guidance',
        constraints: {
            background: { locked: false },
            textColor: { locked: false },
            textAlignment: { locked: false },
            valueTiles: { allowed: ['new', 'white', 'clubcard'] },
        },
        requiredElements: [],
        autoTag: null,
        disabledTools: [],
        styles: {
            textColor: null, // User chooses
            backgroundColor: null,
            fontFamily: 'Inter, sans-serif',
        },
    },
    LOW_EVERYDAY_PRICE: {
        id: 'LOW_EVERYDAY_PRICE',
        name: 'Low Everyday Price',
        icon: '💰',
        description: 'Strict trade-style design for value products',
        constraints: {
            background: { locked: true, value: '#ffffff' },
            textColor: { locked: true, value: '#00539F' },
            textAlignment: { locked: true, value: 'left' },
            valueTiles: { allowed: ['white'] },
        },
        requiredElements: ['lep-tag', 'lep-logo'],
        autoTag: 'Selected stores. While stocks last',
        disabledTools: ['background-picker', 'background-image', 'text-color', 'text-alignment', 'value-tile-new', 'value-tile-clubcard'],
        styles: {
            textColor: '#00539F', // Tesco Blue
            backgroundColor: '#ffffff',
            fontFamily: 'Inter, sans-serif', // Tesco Modern fallback
        },
    },
    CLUBCARD: {
        id: 'CLUBCARD',
        name: 'Clubcard Exclusive',
        icon: '💳',
        description: 'Clubcard member pricing campaigns',
        constraints: {
            background: { locked: false },
            textColor: { locked: false },
            textAlignment: { locked: false },
            valueTiles: { allowed: ['clubcard'] },
        },
        requiredElements: ['clubcard-tag', 'clubcard-tile'],
        autoTag: null, // Tag format depends on end date
        disabledTools: ['value-tile-new', 'value-tile-white'],
        styles: {
            textColor: null,
            backgroundColor: null,
            fontFamily: 'Inter, sans-serif',
            accentColor: '#003d7a', // Clubcard blue
        },
    },
};
// Template Library
export const TEMPLATE_LIBRARY = [
    {
        id: 'promo-sale',
        name: 'Big Sale Banner',
        category: 'Promotion',
        thumbnail: 'sale',
        format: 'instagram-feed',
        elements: [
            { type: 'rect', props: { fill: '#e51c23', width: 1080, height: 1080 } },
            { type: 'text', props: { text: 'BIG SALE', fontSize: 120, fill: '#ffffff', top: 300, left: 540, originX: 'center', fontWeight: 'bold' } },
            { type: 'text', props: { text: 'Up to 50% OFF', fontSize: 60, fill: '#ffd700', top: 450, left: 540, originX: 'center' } },
            { type: 'valueTile', props: { type: 'clubcard', top: 600, left: 440 } },
        ]
    },
    {
        id: 'new-product',
        name: 'New Product Launch',
        category: 'Launch',
        thumbnail: 'new',
        format: 'instagram-feed',
        elements: [
            { type: 'rect', props: { fill: '#003d7a', width: 1080, height: 1080 } },
            { type: 'text', props: { text: 'NEW', fontSize: 80, fill: '#ffffff', top: 150, left: 540, originX: 'center', fontWeight: 'bold' } },
            { type: 'rect', props: { fill: '#ffffff', width: 600, height: 400, top: 340, left: 240, rx: 10 } },
            { type: 'text', props: { text: 'Product Name', fontSize: 40, fill: '#003d7a', top: 800, left: 540, originX: 'center' } },
        ]
    },
    {
        id: 'everyday-value',
        name: 'Everyday Low Price',
        category: 'Value',
        thumbnail: 'value',
        format: 'instagram-feed',
        elements: [
            { type: 'rect', props: { fill: '#ffffff', width: 1080, height: 1080 } },
            { type: 'text', props: { text: 'LOW EVERYDAY PRICE', fontSize: 50, fill: '#003d7a', top: 100, left: 540, originX: 'center', fontWeight: 'bold' } },
            { type: 'rect', props: { fill: '#f5f5f5', width: 500, height: 400, top: 300, left: 290, rx: 10 } },
            { type: 'valueTile', props: { type: 'low-price', top: 750, left: 390 } },
        ]
    },
    {
        id: 'story-promo',
        name: 'Story Promotion',
        category: 'Story',
        thumbnail: 'story',
        format: 'instagram-story',
        elements: [
            { type: 'rect', props: { fill: 'linear-gradient(180deg, #e51c23 0%, #b71c1c 100%)', width: 1080, height: 1920 } },
            { type: 'text', props: { text: 'SWIPE UP', fontSize: 60, fill: '#ffffff', top: 1600, left: 540, originX: 'center' } },
            { type: 'text', props: { text: 'Limited Time\nOffer', fontSize: 80, fill: '#ffffff', top: 800, left: 540, originX: 'center', textAlign: 'center' } },
        ]
    },
    {
        id: 'clubcard-exclusive',
        name: 'Clubcard Exclusive',
        category: 'Clubcard',
        thumbnail: 'clubcard',
        format: 'instagram-feed',
        elements: [
            { type: 'rect', props: { fill: '#003d7a', width: 1080, height: 1080 } },
            { type: 'text', props: { text: 'CLUBCARD', fontSize: 80, fill: '#ffffff', top: 150, left: 540, originX: 'center', fontWeight: 'bold' } },
            { type: 'text', props: { text: 'EXCLUSIVE', fontSize: 60, fill: '#ffd700', top: 250, left: 540, originX: 'center' } },
            { type: 'valueTile', props: { type: 'clubcard', top: 850, left: 400 } },
        ]
    },
    {
        id: 'facebook-banner',
        name: 'Facebook Banner',
        category: 'Facebook',
        thumbnail: 'facebook',
        format: 'facebook-feed',
        elements: [
            { type: 'rect', props: { fill: '#003d7a', width: 1200, height: 628 } },
            { type: 'text', props: { text: 'Shop Now', fontSize: 60, fill: '#ffffff', top: 250, left: 900, originX: 'center', fontWeight: 'bold' } },
            { type: 'rect', props: { fill: '#ffffff', width: 350, height: 400, top: 114, left: 80, rx: 10 } },
        ]
    },
];

// Compliance Rules from Appendix A & B (Complete Implementation)
export const COMPLIANCE_RULES = {
    // ============================================
    // COPY RULES (Appendix B - Hard Fail)
    // ============================================
    prohibitedTerms: [
        // Money-back guarantees (Hard Fail)
        'money back', 'money-back', 'guarantee', 'guaranteed', 'refund',
        // Competition/prize (Hard Fail)
        'competition', 'prize', 'winner', 'winning', 'win', 'lottery', 'raffle', 'giveaway',
        // Sustainability/green claims (Hard Fail)
        'sustainable', 'sustainability', 'eco-friendly', 'eco friendly', 'green',
        'carbon neutral', 'carbon-neutral', 'carbon footprint', 'environmentally friendly',
        'organic', 'recyclable', 'recycled', 'biodegradable', 'zero waste', 'planet friendly',
        // Claims (Hard Fail)
        'best ever', '#1', 'number one', 'number 1', 'award winning', 'award-winning',
        'clinically proven', 'scientifically proven', 'doctor recommended', 'expert recommended',
        // T&Cs indicators (Hard Fail)
        'terms and conditions', 't&c', 't&cs', 'terms apply', 'conditions apply',
        // Free (Hard Fail - price callout)
        'free', 'gratis', 'complimentary',
        // Survey/research (Hard Fail)
        'survey', 'research shows', 'studies show', 'proven by', 'tested by',
        // Charity partnerships (Hard Fail)
        'charity', 'charitable', 'donate', 'donation', 'fundraising', 'supporting',
        // Price callouts outside value tiles (Hard Fail)
        'save £', 'save up to', 'discount', 'deal', 'bargain', 'cheapest', 'lowest price',
        'half price', 'price cut', 'reduced', 'clearance', 'sale price',
    ],

    // ============================================
    // TAG RULES (Appendix A & B)
    // ============================================
    validTags: {
        exclusive: 'Only at Tesco',
        notExclusive: 'Available at Tesco',
        stockWarning: 'Selected stores. While stocks last.',
    },

    // Clubcard tag must include end date in DD/MM format
    clubcardTagPattern: /clubcard.*ends\s*\d{1,2}\/\d{1,2}/i,
    clubcardTagFormat: 'Available in selected stores. Clubcard/app required. Ends DD/MM',

    // Tag positioning for 9:16 stories
    tagSafeZone: {
        topMargin: 200,      // Keep 200px from top
        bottomMargin: 250,   // Keep 250px from bottom
    },

    // ============================================
    // VALUE TILE RULES (Appendix A & B)
    // ============================================
    valueTileRules: {
        types: ['new', 'white', 'clubcard'],
        pricesOnlyInTiles: true,     // Prices can only appear in value tiles
        noManualPriceTyping: true,   // Users cannot type prices in headlines
        positionFixed: true,          // Position is predefined, cannot be moved
        noOverlapping: true,          // Nothing can overlap value tile

        // Type-specific rules
        typeRules: {
            new: {
                editable: false,       // Cannot be edited
                text: 'NEW',
            },
            white: {
                editableFields: ['price'], // Only price can be edited
                background: '#ffffff',
                textColor: '#003d7a',
                border: '#003d7a',
            },
            clubcard: {
                editableFields: ['offerPrice', 'regularPrice'], // Both prices editable
                background: '#003d7a',
                textColor: '#ffffff',
                design: 'flat',        // Clubcard tile design is flat
            },
        },

        // Size constraints
        sizes: {
            new: { width: 120, height: 50 },
            white: { width: 160, height: 60 },
            clubcard: { width: 200, height: 80 },
        },
    },

    // ============================================
    // LOW EVERYDAY PRICE (LEP) RULES (Appendix A)
    // ============================================
    lepRules: {
        background: '#ffffff',        // White background required
        textColor: '#003d7a',         // Tesco blue
        textAlignment: 'left',        // Copy is left-aligned
        valueTileType: 'white',       // White value tile only
        logoPositioning: 'right',     // LEP logo to right of packshot
        tagRequired: true,
        tagText: 'Selected stores. While stocks last',
        noBrandedContent: true,       // No branded content other than logo
    },

    // ============================================
    // DRINKAWARE RULES (Appendix B - Hard Fail)
    // ============================================
    drinkawareRules: {
        required: true,                // Mandatory for alcohol
        minHeight: 20,                 // Minimum 20px height
        minHeightSays: 12,             // SAYS override: 12px minimum
        allowedColors: ['#000000', '#ffffff'], // Only all-black or all-white
        mustHaveContrast: true,        // Sufficient contrast from background
        text: 'drinkaware.co.uk',
    },

    // ============================================
    // PACKSHOT RULES (Appendix A & B)
    // ============================================
    packshotRules: {
        maxCount: 3,                   // Maximum 3 packshots
        leadRequired: true,            // Lead product is required
        positioning: {
            onsiteBrand: 'closestToCTA',    // Closest element to CTA on-site
            checkout: 'closestToCTA',
        },
        safeZone: {
            doubleDensity: 24,         // Minimum 24px gap from CTA
            singleDensity: 12,         // Minimum 12px gap
        },
    },

    // ============================================
    // MINIMUM FONT SIZES (Appendix B - Hard Fail)
    // ============================================
    minFontSize: {
        brandSocialCheckoutDouble: 20, // Brand, Social, Checkout double density
        checkoutSingle: 10,            // Checkout single density
        says: 12,                      // SAYS format
        standard: 20,                  // Default for social banners
    },

    // ============================================
    // SAFE ZONES (Appendix B - Hard Fail)
    // ============================================
    safeZones: {
        story: {
            top: 200,                  // 200px from top free of text/logos/tiles
            bottom: 250,               // 250px from bottom free
            appliesTo: ['facebook-story', 'instagram-story'], // 9:16 formats only
        },
    },

    // ============================================
    // CONTRAST REQUIREMENTS (Appendix B - Hard Fail)
    // ============================================
    contrastRequirements: {
        normalText: 4.5,               // WCAG AA for normal text
        largeText: 3.0,                // WCAG AA for large text
        largeTextThreshold: 24,        // px - text above this is "large"
    },

    // ============================================
    // HEADLINE/SUBHEAD RULES (Appendix A)
    // ============================================
    headlineRules: {
        maxLength: 35,                 // Max 35 characters
        required: true,                // Appears on all banners
    },
    subheadRules: {
        maxWords: 20,                  // Max 20 words
        required: true,                // Appears on all banners
    },

    // ============================================
    // CTA RULES (Appendix B)
    // ============================================
    ctaRules: {
        allowed: false,                // No CTA allowed
        noOverlapping: true,           // Nothing can overlap CTA position
    },

    // ============================================
    // LOGO RULES (Appendix A)
    // ============================================
    logoRules: {
        showOnAllBanners: true,
        canUploadNew: true,
        canUseFromBrandSpace: true,
    },

    // ============================================
    // PHOTOGRAPHY RULES (Appendix B - Warning)
    // ============================================
    photographyRules: {
        peopleDetection: true,         // Detect inclusion of people
        requireConfirmation: true,     // User must confirm people are integral
    },

    // ============================================
    // PRICE PATTERN DETECTION (Appendix B)
    // ============================================
    pricePatterns: [
        /£\d+(\.\d{2})?/,              // £2.50
        /\d+p\b/i,                     // 50p
        /\d+%\s*(off|discount)/i,      // 50% off
        /save\s*£?\d+/i,               // save £5
        /was\s*£?\d+/i,                // was £10
        /now\s*£?\d+/i,                // now £5
        /only\s*£?\d+/i,               // only £5
        /from\s*£?\d+/i,               // from £5
        /\d+\s*for\s*£?\d+/i,          // 3 for £5
        /buy\s*\d+\s*get/i,            // buy 2 get 1
    ],

    // ============================================
    // CLAIMS DETECTION PATTERNS (Appendix B)
    // ============================================
    claimsPatterns: [
        /\*/,                          // Asterisk (indicates T&C)
        /\d+%\s*of\s*(people|customers|users)/i, // Survey claims
        /voted\s*(best|#1)/i,
        /recommended\s*by/i,
        /\d+\s*out\s*of\s*\d+/i,       // "9 out of 10"
    ],

    // ============================================
    // DD/MM DATE FORMAT (Appendix A)
    // ============================================
    dateFormat: {
        pattern: /\d{1,2}\/\d{1,2}/,   // DD/MM format
        example: '23/06',
        requiredFor: 'clubcardTile',
    },
};

export const useStore = create((set, get) => ({
    // ============================================
    // PROCESSING STATE (Race Condition Prevention)
    // ============================================
    processingState: {
        isProcessing: false,
        operation: null,     // 'background-removal' | 'logo-upload' | 'template-apply' | 'ai-generation'
        progress: 0,
        status: '',
    },

    startProcessing: (operation, status = '') => {
        const current = get().processingState;
        if (current.isProcessing) {
            console.warn(`⚠️ Blocked: Cannot start "${operation}" while "${current.operation}" is in progress`);
            return false;
        }
        set({
            processingState: {
                isProcessing: true,
                operation,
                progress: 0,
                status,
            }
        });
        return true;
    },

    updateProgress: (progress, status) => set(state => ({
        processingState: { ...state.processingState, progress, status }
    })),

    clearProcessing: () => set({
        processingState: {
            isProcessing: false,
            operation: null,
            progress: 0,
            status: '',
        }
    }),

    // ============================================
    // ZOOM LEVEL
    // ============================================
    zoomLevel: 45,
    setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

    // Canvas instance
    canvas: null,
    setCanvas: (canvas) => set({ canvas }),

    // Current format preset
    currentFormat: 'instagram-feed',
    setCurrentFormat: (formatKey) => {
        const format = FORMAT_PRESETS[formatKey];
        if (format) {
            set({ currentFormat: formatKey });
            const canvas = get().canvas;
            if (canvas) {
                // Will be handled by canvas component
            }
        }
    },

    // Selected object
    selectedObject: null,
    setSelectedObject: (obj) => set({ selectedObject: obj }),

    // Layers management
    layers: [],
    updateLayers: () => {
        const canvas = get().canvas;
        if (canvas) {
            const objects = canvas.getObjects().filter(o => !o.isSafeZone && !o.isBackground);
            set({
                layers: objects.map((obj, i) => ({
                    id: obj.id || `layer-${i}`,
                    name: obj.customName || obj.type || 'Layer',
                    type: obj.type,
                    visible: obj.visible !== false,
                    locked: obj.lockMovementX && obj.lockMovementY,
                    object: obj,
                }))
            });
        }
    },

    // Background
    backgroundColor: '#ffffff',
    setBackgroundColor: (color) => set({ backgroundColor: color }),
    backgroundImage: null,
    setBackgroundImage: (img) => set({ backgroundImage: img }),

    // Logo
    logo: null,
    setLogo: (logo) => set({ logo }),

    // Packshots tracking
    packshots: [],
    addPackshot: (packshot) => set(state => ({
        packshots: state.packshots.length < 3 ? [...state.packshots, packshot] : state.packshots
    })),
    removePackshot: (id) => set(state => ({
        packshots: state.packshots.filter(p => p.id !== id)
    })),
    clearPackshots: () => set({ packshots: [] }),

    // Saved color palette
    savedColors: ['#003d7a', '#e51c23', '#ffffff', '#ffd700', '#00a650', '#000000', '#f5f5f5', '#ff9800'],
    addSavedColor: (color) => set(state => ({
        savedColors: [...new Set([color, ...state.savedColors])].slice(0, 12)
    })),

    // Product settings
    isAlcoholProduct: false,
    setIsAlcoholProduct: (val) => set({ isAlcoholProduct: val }),
    productCategory: 'general',
    setProductCategory: (cat) => set({ productCategory: cat }),

    // Creative Profile (replaces isLEPMode)
    creativeProfile: 'STANDARD',
    setCreativeProfile: (profileId) => {
        const profile = CREATIVE_PROFILES[profileId];
        if (!profile) return;

        set({ creativeProfile: profileId });

        // If profile locks background, update backgroundColor
        if (profile.constraints.background.locked) {
            set({ backgroundColor: profile.constraints.background.value });
        }
    },

    // Backward compatibility getter (derived from creativeProfile)
    isLEPMode: false, // Will be computed in components via: creativeProfile === 'LOW_EVERYDAY_PRICE'
    setIsLEPMode: (val) => {
        // Legacy support - maps boolean to profile
        set({
            creativeProfile: val ? 'LOW_EVERYDAY_PRICE' : 'STANDARD',
            isLEPMode: val
        });
    },

    // Compliance tracking
    complianceErrors: [],
    complianceWarnings: [],
    addComplianceError: (error) => set(state => ({
        complianceErrors: [...state.complianceErrors.filter(e => e.id !== error.id), error]
    })),
    addComplianceWarning: (warning) => set(state => ({
        complianceWarnings: [...state.complianceWarnings.filter(w => w.id !== warning.id), warning]
    })),
    removeComplianceIssue: (id) => set(state => ({
        complianceErrors: state.complianceErrors.filter(e => e.id !== id),
        complianceWarnings: state.complianceWarnings.filter(w => w.id !== id),
    })),
    clearCompliance: () => set({ complianceErrors: [], complianceWarnings: [], complianceScore: 100 }),
    isCompliant: () => get().complianceErrors.length === 0,

    // Compliance Score (0-100 gamification)
    complianceScore: 100,
    hasHardFailErrors: false, // True when any hard fail compliance errors exist
    setComplianceScore: (score) => set({ complianceScore: Math.max(0, Math.min(100, score)) }),
    calculateComplianceScore: () => {
        const errors = get().complianceErrors.length;
        const warnings = get().complianceWarnings.length;
        // Hard fail = score 0 immediately (all compliance errors are hard fails)
        const hasHardFails = errors > 0;
        const score = hasHardFails ? 0 : Math.max(0, 100 - (warnings * 5));
        set({ complianceScore: score, hasHardFailErrors: hasHardFails });
        return score;
    },

    // History for undo/redo
    history: [],
    historyIndex: -1,
    maxHistory: 30,

    saveToHistory: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        const state = {
            canvas: canvas.toJSON(['id', 'customName', 'isValueTile', 'valueTileType', 'isDrinkaware', 'isSafeZone', 'isBackground', 'isLogo', 'isPackshot', 'isLeadPackshot', 'isTag']),
            backgroundColor: canvas.backgroundColor || get().backgroundColor
        };
        const json = JSON.stringify(state);
        set(state => {
            const newHistory = [...state.history.slice(0, state.historyIndex + 1), json].slice(-state.maxHistory);
            return { history: newHistory, historyIndex: newHistory.length - 1 };
        });
    },

    undo: async () => {
        const { canvas, history, historyIndex } = get();
        if (!canvas || historyIndex <= 0) return;
        const newIndex = historyIndex - 1;
        try {
            const state = JSON.parse(history[newIndex]);
            // Handle both old format (raw JSON) and new format (with backgroundColor)
            const canvasData = state.canvas || state;
            const bgColor = state.backgroundColor || canvasData.backgroundColor || '#ffffff';

            // Update index immediately to prevent double-clicks
            set({ historyIndex: newIndex });

            // Fabric.js v6 loadFromJSON returns a Promise
            await canvas.loadFromJSON(canvasData);

            // Set background color after loading
            canvas.backgroundColor = bgColor;
            set({ backgroundColor: bgColor });

            // Request animation frame to ensure proper render
            canvas.requestRenderAll();
            get().updateLayers();
        } catch (e) {
            console.error('Undo failed:', e);
        }
    },

    redo: async () => {
        const { canvas, history, historyIndex } = get();
        if (!canvas || historyIndex >= history.length - 1) return;
        const newIndex = historyIndex + 1;
        try {
            const state = JSON.parse(history[newIndex]);
            const canvasData = state.canvas || state;
            const bgColor = state.backgroundColor || canvasData.backgroundColor || '#ffffff';

            // Update index immediately to prevent double-clicks
            set({ historyIndex: newIndex });

            // Fabric.js v6 loadFromJSON returns a Promise
            await canvas.loadFromJSON(canvasData);

            // Set background color after loading
            canvas.backgroundColor = bgColor;
            set({ backgroundColor: bgColor });

            // Request animation frame to ensure proper render
            canvas.requestRenderAll();
            get().updateLayers();
        } catch (e) {
            console.error('Redo failed:', e);
        }
    },

    // Onboarding
    showOnboarding: true,
    setShowOnboarding: (val) => set({ showOnboarding: val }),

    // Active panel
    activePanel: 'assets', // 'assets', 'templates', 'layers', 'compliance'
    setActivePanel: (panel) => set({ activePanel: panel }),
}));

export default useStore;
