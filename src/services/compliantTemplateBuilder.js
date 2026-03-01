/**
 * Compliant Template Builder
 * 
 * Builds compliant canvas layouts using the same structure as AI Creative Gallery.
 * This ensures all Magic Wand outputs have proper:
 * - Fixed layout positions (headline, subheadline, packshot, tiles)
 * - Locked, non-movable value tiles
 * - Proper tag formatting (Clubcard = date required)
 * - Drinkaware lockup for alcohol products
 * 
 * Pipeline: AI Copy → Compliance Filter → Template Builder → Canvas
 */

import { FabricImage, IText, Rect, Circle } from 'fabric';
import { FORMAT_PRESETS } from '../store/useStore';

// Value tile definitions - matches DemoGallery and Sidebar
const VALUE_TILES = [
    {
        id: 'new', name: 'New', bg: '#00539F', text: '#ffffff', w: 100, h: 40, fontSize: 24, editable: false,
        formatOverrides: {
            'instagram-feed': { w: 100, h: 40, fontSize: 24 },
            'instagram-story': { w: 120, h: 48, fontSize: 28 },
            'facebook-feed': { w: 90, h: 36, fontSize: 22 },
            'facebook-story': { w: 120, h: 48, fontSize: 28 },
            'display-banner': { w: 60, h: 24, fontSize: 14 },
            'display-mpu': { w: 50, h: 20, fontSize: 12 },
            'pos-portrait': { w: 80, h: 32, fontSize: 18 },
            'pos-landscape': { w: 80, h: 32, fontSize: 18 },
        }
    },
    {
        id: 'white', name: 'White', bg: '#ffffff', text: '#00539F', w: 160, h: 60, fontSize: 32, editable: 'price', border: '#00539F',
        formatOverrides: {
            'instagram-feed': { w: 160, h: 60, fontSize: 32 },
            'instagram-story': { w: 180, h: 70, fontSize: 36 },
            'facebook-feed': { w: 140, h: 52, fontSize: 28 },
            'facebook-story': { w: 180, h: 70, fontSize: 36 },
            'display-banner': { w: 80, h: 30, fontSize: 16 },
            'display-mpu': { w: 70, h: 28, fontSize: 14 },
            'pos-portrait': { w: 120, h: 48, fontSize: 22 },
            'pos-landscape': { w: 120, h: 48, fontSize: 22 },
        }
    },
    {
        id: 'clubcard', name: 'Clubcard Price', bg: '#FFD700', text: '#00539F', w: 160, h: 160, fontSize: 48, editable: 'prices', isCircular: true,
        formatOverrides: {
            'instagram-feed': { w: 160, h: 160, fontSize: 48, labelFontSize: 14 },
            'instagram-story': { w: 200, h: 200, fontSize: 56, labelFontSize: 18 },
            'facebook-feed': { w: 130, h: 130, fontSize: 38, labelFontSize: 12 },
            'facebook-story': { w: 200, h: 200, fontSize: 56, labelFontSize: 18 },
            'display-banner': { w: 60, h: 60, fontSize: 18, labelFontSize: 8 },
            'display-mpu': { w: 70, h: 70, fontSize: 22, labelFontSize: 9 },
            'pos-portrait': { w: 120, h: 120, fontSize: 36, labelFontSize: 11 },
            'pos-landscape': { w: 120, h: 120, fontSize: 36, labelFontSize: 11 },
        }
    },
];

// Fixed layout positions - same as AI Creative Gallery (100% compliant)
const LAYOUT = {
    headlineY: 0.25,      // Headline at 25% from top
    subheadlineY: 0.38,   // Subheadline at 38% from top
    packshotY: 0.55,      // Packshot center at 55% from top
    tileY: 0.82,          // Value tile at 82% from top
    tagY: 0.95,           // Tag at bottom
};

/**
 * Build a compliant canvas layout
 * Uses the same structure as AI Creative Gallery to ensure 100% compliance
 * 
 * @param {fabric.Canvas} canvas - The Fabric.js canvas
 * @param {object} variant - The creative variant (headline, subheadline, colors, etc.)
 * @param {object} product - Product info (name, brand, isAlcohol)
 * @param {string} formatKey - Format key (e.g., 'instagram-feed')
 * @param {object} callbacks - Callbacks for state updates
 */
export async function buildCompliantCanvas(canvas, variant, product, formatKey, callbacks = {}) {
    const { setBackgroundColor, setIsAlcoholProduct, saveToHistory, updateLayers } = callbacks;

    const format = FORMAT_PRESETS[formatKey];
    if (!format) {
        throw new Error(`Unknown format: ${formatKey}`);
    }

    // Clear canvas (preserve safe zones)
    canvas.getObjects().forEach(obj => {
        if (!obj.isSafeZone) canvas.remove(obj);
    });

    // Set background color
    canvas.backgroundColor = variant.backgroundColor || '#1a1a1a';
    setBackgroundColor?.(variant.backgroundColor || '#1a1a1a');

    const formatConfig = format.config || {};

    // Helper to get format-specific tile dimensions
    const getTileForFormat = (tile, formatKey) => {
        const overrides = tile.formatOverrides?.[formatKey];
        return overrides ? { ...tile, ...overrides } : tile;
    };

    // Scale font sizes based on format
    const headlineFontSize = formatConfig.headlineFontSize || 72;
    const subFontSize = formatConfig.subFontSize || 36;

    // ============ ADD HEADLINE ============
    const headline = new IText(variant.headline || 'Your Headline', {
        left: format.width / 2,
        top: format.height * LAYOUT.headlineY,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Inter, sans-serif',
        fontSize: headlineFontSize,
        fontWeight: 'bold',
        fill: variant.headlineColor || variant.textColor || '#ffffff',
        textAlign: 'center',
        customName: 'Headline',
    });
    canvas.add(headline);

    // ============ ADD SUBHEADLINE ============
    const subheadline = new IText(variant.subheadline || 'Your subheadline here', {
        left: format.width / 2,
        top: format.height * LAYOUT.subheadlineY,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Inter, sans-serif',
        fontSize: subFontSize,
        fill: variant.headlineColor || variant.textColor || '#ffffff',
        opacity: 0.8,
        textAlign: 'center',
        customName: 'Subheadline',
    });
    canvas.add(subheadline);

    // ============ ADD VALUE TILE ============
    const baseTile = VALUE_TILES.find(t => t.id === variant.priceType) || VALUE_TILES[2]; // Default to clubcard
    const tile = getTileForFormat(baseTile, formatKey);

    // Fixed positions based on tile type (compliance-locked)
    const standardTileY = format.height - tile.h - 30;
    const clubcardTileY = format.height - (tile.h / 2) - 40;

    let tilePositions = {
        'new': { x: format.width * 0.15, y: standardTileY },
        'white': { x: format.width * 0.5, y: standardTileY },
        'clubcard': { x: format.width * 0.5, y: clubcardTileY },
    };

    // Adjust for horizontal layouts
    if (formatConfig.layout === 'horizontal') {
        tilePositions.new = { x: format.width * 0.85, y: format.height * 0.25 };
        tilePositions.white = { x: format.width * 0.85, y: format.height * 0.5 };
        tilePositions.clubcard = { x: format.width * 0.85, y: format.height * 0.5 };
    }

    const pos = tilePositions[tile.id] || { x: format.width / 2, y: standardTileY };

    // Handle Clubcard tile differently - circular design
    if (tile.isCircular && tile.id === 'clubcard') {
        const radius = tile.w / 2;

        // Yellow circular background
        const circle = new Circle({
            radius: radius,
            fill: tile.bg, // Tesco yellow #FFD700
            originX: 'center',
            originY: 'center',
            left: pos.x,
            top: pos.y,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            isValueTile: true,
            valueTileType: tile.id,
            customName: 'Clubcard Circle',
        });
        canvas.add(circle);

        // Offer price - large, bold, centered in circle
        const priceText = new IText(variant.price || '£1.50', {
            fontSize: tile.fontSize,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            fill: tile.text, // Tesco blue #00539F
            originX: 'center',
            originY: 'center',
            left: pos.x,
            top: pos.y - (radius * 0.15),
            textAlign: 'center',
            selectable: true,
            evented: true,
            editable: true,
            lockMovementX: true,
            lockMovementY: true,
            isValueTile: true,
            valueTileType: tile.id,
            customName: 'Clubcard Price',
        });
        canvas.add(priceText);

        // "Clubcard Price" label below price
        const labelText = new IText('Clubcard Price', {
            fontSize: tile.labelFontSize || 14,
            fontWeight: 'normal',
            fontFamily: 'Inter, sans-serif',
            fill: tile.text,
            originX: 'center',
            originY: 'center',
            left: pos.x,
            top: pos.y + (radius * 0.45),
            textAlign: 'center',
            selectable: false,
            evented: false,
            isValueTile: true,
            valueTileType: tile.id,
            customName: 'Clubcard Label',
        });
        canvas.add(labelText);

        // Regular price - shown to the left of the circle
        const regularPriceX = pos.x - radius - 90; // Increased spacing

        // "Original Price" label above the regular price
        const originalPriceLabel = new IText('Original Price', {
            fontSize: tile.fontSize * 0.25,
            fontWeight: 'normal',
            fontFamily: 'Inter, sans-serif',
            fill: '#00539F', // Tesco blue
            originX: 'center',
            originY: 'center',
            left: regularPriceX,
            top: pos.y - (tile.fontSize * 0.45),
            textAlign: 'center',
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            isValueTile: true,
            valueTileType: 'clubcard-regular',
            customName: 'Original Price Label',
        });
        canvas.add(originalPriceLabel);

        const regularPriceText = new IText(variant.wasPrice || '£2.00', {
            fontSize: tile.fontSize * 0.7,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            fill: '#00539F',
            originX: 'center',
            originY: 'center',
            left: regularPriceX,
            top: pos.y + (tile.fontSize * 0.1), // Slightly lower
            textAlign: 'center',
            selectable: true,
            evented: true,
            editable: true,
            lockMovementX: true,
            lockMovementY: true,
            isValueTile: true,
            valueTileType: 'clubcard-regular',
            customName: 'Regular Price',
        });
        canvas.add(regularPriceText);

    } else {
        // Standard rectangular tiles (NEW, White)
        const tileRect = new Rect({
            width: tile.w,
            height: tile.h,
            fill: tile.bg,
            rx: 4,
            ry: 4,
            stroke: tile.border || null,
            strokeWidth: tile.border ? 2 : 0,
            originX: 'center',
            originY: 'center',
            left: pos.x,
            top: pos.y,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            isValueTile: true,
            valueTileType: tile.id,
            customName: tile.name,
        });

        // Prepare display text based on tile type
        let displayText = tile.name;
        if (tile.id === 'white') displayText = variant.price || '£2.50';

        // Text editability depends on tile type
        const isEditable = tile.id !== 'new';

        // Create tile text
        const tileText = new IText(displayText, {
            fontSize: tile.fontSize,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            fill: tile.text,
            originX: 'center',
            originY: 'center',
            left: pos.x,
            top: pos.y,
            textAlign: 'center',
            selectable: isEditable,
            evented: isEditable,
            editable: isEditable,
            lockMovementX: true,
            lockMovementY: true,
            isValueTile: true,
            valueTileType: tile.id,
            customName: `${tile.name} Text`,
        });

        canvas.add(tileRect);
        canvas.add(tileText);
    }


    // ============ ADD DRINKAWARE (for alcohol) ============
    if (product?.isAlcohol) {
        setIsAlcoholProduct?.(true);
        const drinkRect = new Rect({
            width: 200,
            height: 32,
            fill: '#ffffff',
            rx: 4,
            ry: 4,
            originX: 'center',
            originY: 'center',
            left: format.width - 110,
            top: format.height - 45,
            isDrinkaware: true,
            customName: 'Drinkaware',
            selectable: false,
            evented: false,
        });
        const drinkText = new IText('drinkaware.co.uk', {
            fontSize: 20, // FIXED: minimum 20px for compliance
            fontFamily: 'Inter, sans-serif',
            fill: '#000000',
            originX: 'center',
            originY: 'center',
            left: format.width - 110,
            top: format.height - 45,
            isDrinkaware: true,
            selectable: false,
            evented: false,
        });
        canvas.add(drinkRect, drinkText);
    }

    // ============ ADD TAG ============
    // Proper tag formatting based on tile type (compliance requirement)
    let tagText = variant.tag || 'Only at Tesco';
    if (variant.priceType === 'clubcard') {
        // For Clubcard, must include end date per compliance rules
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14); // 2 weeks from now
        const dd = String(endDate.getDate()).padStart(2, '0');
        const mm = String(endDate.getMonth() + 1).padStart(2, '0');
        tagText = `Clubcard/app required. Ends ${dd}/${mm}`;
    }

    const tag = new IText(tagText, {
        left: format.width / 2,
        top: format.height - 50,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Inter, sans-serif',
        fontSize: 18,
        fill: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        isTag: true,
        customName: 'Tesco Tag',
    });
    canvas.add(tag);

    // ============ FINALIZE ============
    canvas.renderAll();
    saveToHistory?.();
    updateLayers?.();

    return {
        success: true,
        elementsAdded: ['headline', 'subheadline', 'valueTile', 'tag', ...(product?.isAlcohol ? ['drinkaware'] : [])]
    };
}

/**
 * Add packshot image to canvas at compliant position
 * Automatically removes background using AI for clean packshots
 */
export async function addPackshotToCanvas(canvas, imageDataUrl, formatKey, options = {}) {
    const format = FORMAT_PRESETS[formatKey];
    if (!format) return;

    const { skipBackgroundRemoval = false } = options;

    try {
        let processedImageUrl = imageDataUrl;

        // Apply background removal unless explicitly skipped
        if (!skipBackgroundRemoval && imageDataUrl !== 'demo') {
            try {
                // Dynamic import to avoid circular dependencies
                const { default: backgroundRemovalService } = await import('./backgroundRemovalService');
                const result = await backgroundRemovalService.removeBackground(imageDataUrl);
                if (result.success) {
                    processedImageUrl = result.resultDataUrl;
                    console.log('✓ Background removed for Magic Wand packshot');
                }
            } catch (bgError) {
                console.warn('Background removal failed, using original image:', bgError);
                // Continue with original image
            }
        }

        const img = await FabricImage.fromURL(processedImageUrl);

        // Scale packshot to fit nicely (max 40% of canvas width)
        const maxWidth = format.width * 0.4;
        const maxHeight = format.height * 0.35;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);

        img.set({
            left: format.width / 2,
            top: format.height * LAYOUT.packshotY,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            customName: 'Packshot',
            isPackshot: true,
        });

        canvas.add(img);
        canvas.renderAll();

        return { success: true, backgroundRemoved: processedImageUrl !== imageDataUrl };
    } catch (error) {
        console.error('Failed to add packshot:', error);
        return { success: false, error };
    }
}

export default {
    buildCompliantCanvas,
    addPackshotToCanvas,
    LAYOUT,
    VALUE_TILES,
};
