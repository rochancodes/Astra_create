/**
 * useCompliance Hook - Refactored
 * 
 * Integrates with the new schema-driven ComplianceEngine while maintaining
 * backward compatibility with the existing API.
 * 
 * The hook provides:
 * - Real-time quick validation (layout + regex)
 * - Full validation before export (includes AI)
 * - Individual check functions for legacy compatibility
 */

import { useCallback, useRef } from 'react';
import tinycolor from 'tinycolor2';
import useStore, { FORMAT_PRESETS } from '../store/useStore';
import complianceEngine, { RULE_SCHEMA } from '../compliance';

// Legacy COMPLIANCE_RULES for backward compatibility
// TODO: Migrate all consumers to use RULE_SCHEMA instead
export const COMPLIANCE_RULES = {
  prohibitedTerms: RULE_SCHEMA.rules
    .filter(r => r.category === 'copy' && r.params?.regex_patterns)
    .flatMap(r => r.params.regex_patterns.map(p => p.replace(/\\b/g, ''))),
  
  headlineRules: { maxLength: 35, required: true },
  subheadRules: { maxWords: 20, required: true },
  
  validTags: {
    exclusive: 'Only at Tesco',
    notExclusive: 'Available at Tesco',
    stockWarning: 'Selected stores. While stocks last.',
  },
  
  clubcardTagPattern: /clubcard.*ends\s*\d{1,2}\/\d{1,2}/i,
  
  valueTileRules: {
    types: ['new', 'white', 'clubcard'],
    pricesOnlyInTiles: true,
    positionFixed: true,
    noOverlapping: true,
  },
  
  drinkawareRules: {
    required: true,
    minHeight: 20,
    allowedColors: ['#000000', '#ffffff'],
    text: 'drinkaware.co.uk',
  },
  
  packshotRules: {
    maxCount: 3,
    leadRequired: true,
  },
  
  minFontSize: { standard: 20, checkoutSingle: 10 },
  
  safeZones: {
    story: { top: 200, bottom: 250, appliesTo: ['facebook-story', 'instagram-story'] },
  },
  
  contrastRequirements: {
    normalText: 4.5,
    largeText: 3.0,
    largeTextThreshold: 24,
  },
  
  claimsPatterns: [
    /\*/,
    /\d+%\s*of\s*(people|customers|users)/i,
    /voted\s*(best|#1)/i,
    /recommended\s*by/i,
    /\d+\s*out\s*of\s*\d+/i,
  ],
};

export const useCompliance = () => {
  const {
    addComplianceError,
    addComplianceWarning,
    removeComplianceIssue,
    clearCompliance,
    isAlcoholProduct,
    isLEPMode,
    currentFormat,
    canvas,
    backgroundColor,
    calculateComplianceScore,
    backgroundImage,
  } = useStore();

  const lastResultRef = useRef(null);

  // ============================================
  // ENGINE-BASED VALIDATION
  // ============================================

  /**
   * Run full compliance check using the new engine
   * This replaces the old procedural validation
   */
  const runFullCompliance = useCallback(async (options = {}) => {
    if (!canvas) return { errors: 0, warnings: 0 };

    // Clear previous issues
    clearCompliance();

    // Build context for engine
    const context = {
      currentFormat,
      backgroundColor: backgroundColor || canvas.backgroundColor || '#ffffff',
      isAlcoholProduct,
      isLEPMode,
      backgroundImageUrl: backgroundImage?.src || null,
      canvasDataUrl: options.includeVision ? canvas.toDataURL() : null,
      peopleConfirmed: options.peopleConfirmed || false,
    };

    // Choose quick or full validation
    const result = options.fullValidation
      ? await complianceEngine.evaluateFull(canvas, context)
      : await complianceEngine.evaluateQuick(canvas, context);

    // Convert engine results to store format
    for (const error of result.errors) {
      addComplianceError({
        id: error.ruleId + (error.objectId ? `-${error.objectId}` : ''),
        type: error.category || 'design',
        severity: 'error',
        title: error.ruleName,
        message: error.explanation,
        suggestion: error.plainEnglish,
        plainEnglish: error.plainEnglish,
        rule: `Rule ${error.ruleId}`,
        objectId: error.objectId,
        ruleId: error.ruleId,
        matchedTerms: error.matchedTerms,
      });
    }

    for (const warning of result.warnings) {
      addComplianceWarning({
        id: warning.ruleId + (warning.objectId ? `-${warning.objectId}` : ''),
        type: warning.category || 'design',
        severity: 'warning',
        title: warning.ruleName,
        message: warning.explanation,
        suggestion: warning.plainEnglish,
        plainEnglish: warning.plainEnglish,
        rule: `Rule ${warning.ruleId}`,
        objectId: warning.objectId,
        ruleId: warning.ruleId,
        requiresConfirmation: warning.requiresConfirmation,
      });
    }

    // Calculate score
    calculateComplianceScore();

    lastResultRef.current = result;

    return {
      errors: result.errors.length,
      warnings: result.warnings.length,
      canExport: result.canExport,
      score: result.score,
    };
  }, [
    canvas, clearCompliance, currentFormat, backgroundColor,
    isAlcoholProduct, isLEPMode, backgroundImage,
    addComplianceError, addComplianceWarning, calculateComplianceScore
  ]);

  // ============================================
  // LEGACY CHECK FUNCTIONS (Backward Compatibility)
  // These delegate to the engine or use simplified logic
  // ============================================

  const checkProhibitedTerms = useCallback((text, objectId) => {
    const lowerText = text.toLowerCase();
    const found = COMPLIANCE_RULES.prohibitedTerms.filter(term =>
      lowerText.includes(term.toLowerCase())
    );

    if (found.length > 0) {
      addComplianceError({
        id: `prohibited-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Prohibited Content',
        message: `Contains: "${found.slice(0, 3).join('", "')}"`,
        suggestion: 'Remove these terms - not allowed on self-serve media.',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`prohibited-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  const checkHeadlineLength = useCallback((text, objectId, isHeadline = false) => {
    if (!isHeadline) return true;
    const maxLength = COMPLIANCE_RULES.headlineRules.maxLength;
    
    if (text.length > maxLength) {
      addComplianceError({
        id: `headline-length-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Headline Too Long',
        message: `${text.length} chars (max ${maxLength})`,
        suggestion: `Shorten to ${maxLength} characters or less.`,
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`headline-length-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  const checkSubheadWords = useCallback((text, objectId, isSubhead = false) => {
    if (!isSubhead) return true;
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const maxWords = COMPLIANCE_RULES.subheadRules.maxWords;

    if (wordCount > maxWords) {
      addComplianceError({
        id: `subhead-words-${objectId}`,
        type: 'copy',
        severity: 'error',
        title: 'Subhead Too Long',
        message: `${wordCount} words (max ${maxWords})`,
        suggestion: `Reduce to ${maxWords} words or less.`,
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`subhead-words-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue]);

  const checkFontSize = useCallback((fontSize, objectId) => {
    const format = FORMAT_PRESETS[currentFormat];
    const isSmallFormat = format && format.height < 200;
    const minSize = isSmallFormat ? 10 : COMPLIANCE_RULES.minFontSize.standard;

    if (fontSize < minSize) {
      addComplianceError({
        id: `font-size-${objectId}`,
        type: 'accessibility',
        severity: 'error',
        title: 'Font Size Too Small',
        message: `${Math.round(fontSize)}px is below minimum ${minSize}px`,
        suggestion: `Increase font size to at least ${minSize}px.`,
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`font-size-${objectId}`);
    return true;
  }, [currentFormat, addComplianceError, removeComplianceIssue]);

  const checkContrast = useCallback((textColor, bgColor, objectId, fontSize = 16) => {
    const effectiveBg = bgColor || backgroundColor;
    const contrast = tinycolor.readability(textColor, effectiveBg);
    const isLargeText = fontSize >= COMPLIANCE_RULES.contrastRequirements.largeTextThreshold;
    const requiredContrast = isLargeText
      ? COMPLIANCE_RULES.contrastRequirements.largeText
      : COMPLIANCE_RULES.contrastRequirements.normalText;

    if (contrast < requiredContrast) {
      addComplianceError({
        id: `contrast-${objectId}`,
        type: 'accessibility',
        severity: 'error',
        title: 'Insufficient Contrast',
        message: `Ratio ${contrast.toFixed(1)}:1 (need ${requiredContrast}:1)`,
        suggestion: 'Increase contrast for WCAG AA compliance.',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`contrast-${objectId}`);
    return true;
  }, [addComplianceError, removeComplianceIssue, backgroundColor]);

  const checkSafeZone = useCallback((object) => {
    const format = FORMAT_PRESETS[currentFormat];
    if (!format || format.ratio !== '9:16') return true;
    if (object.isValueTile || object.isDrinkaware || object.isTag || object.isBackground) return true;

    const objectId = object.id || object._id || 'obj';
    const safeZone = COMPLIANCE_RULES.safeZones.story;
    const objTop = object.top || 0;
    const objHeight = (object.height || 0) * (object.scaleY || 1);
    const objBottom = objTop + objHeight;

    const inTopZone = objTop < safeZone.top;
    const inBottomZone = objBottom > (format.height - safeZone.bottom);
    const isCheckableElement = object.type === 'i-text' || object.type === 'text' || object.isLogo;

    if ((inTopZone || inBottomZone) && isCheckableElement) {
      addComplianceError({
        id: `safezone-${objectId}`,
        type: 'format',
        severity: 'error',
        title: 'Safe Zone Violation',
        message: `Element in ${inTopZone ? 'top' : 'bottom'} ${inTopZone ? safeZone.top : safeZone.bottom}px zone`,
        suggestion: 'Move element out of safe zone for 9:16 formats.',
        objectId,
      });
      return false;
    }
    removeComplianceIssue(`safezone-${objectId}`);
    return true;
  }, [currentFormat, addComplianceError, removeComplianceIssue]);

  const checkDrinkaware = useCallback(() => {
    if (!isAlcoholProduct) {
      removeComplianceIssue('drinkaware');
      return true;
    }
    if (!canvas) return true;

    const drinkawareObjects = canvas.getObjects().filter(o => o.isDrinkaware);
    if (drinkawareObjects.length === 0) {
      addComplianceError({
        id: 'drinkaware',
        type: 'alcohol',
        severity: 'error',
        title: 'Drinkaware Required',
        message: 'Alcohol products must include Drinkaware lockup',
        suggestion: 'Add Drinkaware from sidebar.',
      });
      return false;
    }

    const minHeight = COMPLIANCE_RULES.drinkawareRules.minHeight;
    const hasValidHeight = drinkawareObjects.some(obj => {
      const height = (obj.height || 0) * (obj.scaleY || 1);
      return height >= minHeight;
    });

    if (!hasValidHeight) {
      addComplianceError({
        id: 'drinkaware-height',
        type: 'alcohol',
        severity: 'error',
        title: 'Drinkaware Too Small',
        message: `Must be at least ${minHeight}px in height`,
        suggestion: 'Increase Drinkaware lockup size.',
      });
      return false;
    }

    removeComplianceIssue('drinkaware');
    removeComplianceIssue('drinkaware-height');
    return true;
  }, [isAlcoholProduct, canvas, addComplianceError, removeComplianceIssue]);

  const checkPackshots = useCallback(() => {
    if (!canvas) return true;
    const packshots = canvas.getObjects().filter(o => o.isPackshot);
    const maxCount = COMPLIANCE_RULES.packshotRules.maxCount;

    if (packshots.length > maxCount) {
      addComplianceError({
        id: 'packshots-max',
        type: 'design',
        severity: 'error',
        title: 'Too Many Packshots',
        message: `${packshots.length} packshots (max ${maxCount})`,
        suggestion: `Remove ${packshots.length - maxCount} packshot(s).`,
      });
      return false;
    }

    if (packshots.length > 0) {
      const hasLead = packshots.some(p => p.isLeadPackshot);
      if (!hasLead) {
        addComplianceWarning({
          id: 'packshot-lead',
          type: 'design',
          severity: 'warning',
          title: 'No Lead Packshot',
          message: 'Consider marking a primary product',
          suggestion: 'Set one packshot as lead product.',
        });
      } else {
        removeComplianceIssue('packshot-lead');
      }
    }

    removeComplianceIssue('packshots-max');
    return true;
  }, [canvas, addComplianceError, addComplianceWarning, removeComplianceIssue]);

  // Stub functions for backward compatibility
  const checkClaims = useCallback(() => true, []);
  const checkPriceText = useCallback(() => true, []);
  const checkTagText = useCallback(() => true, []);
  const checkValueTileOverlap = useCallback(() => true, []);
  const checkClubcardTag = useCallback(() => true, []);
  const checkRequiredElements = useCallback(() => ({ warnings: 0 }), []);
  const checkCTAPosition = useCallback(() => true, []);
  const checkPackshotCTAGap = useCallback(() => true, []);
  const checkValueTileSize = useCallback(() => true, []);
  const checkValueTilePosition = useCallback(() => true, []);
  const checkTagRequired = useCallback(() => true, []);
  const checkLEPMode = useCallback(() => true, []);

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // New engine-based validation
    runFullCompliance,
    getLastResult: () => lastResultRef.current,

    // Legacy functions (backward compatibility)
    checkProhibitedTerms,
    checkClaims,
    checkPriceText,
    checkHeadlineLength,
    checkSubheadWords,
    checkTagText,
    checkValueTileOverlap,
    checkFontSize,
    checkContrast,
    checkSafeZone,
    checkDrinkaware,
    checkClubcardTag,
    checkPackshots,
    checkRequiredElements,
    checkCTAPosition,
    checkPackshotCTAGap,
    checkValueTileSize,
    checkValueTilePosition,
    checkTagRequired,
    checkLEPMode,
  };
};

export default useCompliance;
