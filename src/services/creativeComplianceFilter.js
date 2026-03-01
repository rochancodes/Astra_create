/**
 * Creative Compliance Filter Service
 * 
 * Validates and fixes AI-generated creative specs for compliance.
 * This is the "Compliance Filter" step in the pipeline:
 * User Input → AI Creative Spec → **Compliance Filter** → Canvas Build → Export
 */

import { validateCompliance } from './geminiService';
import regexDetector from '../compliance/detectors/regexDetector';

// PROHIBITED_TERMS for manual checking
const PROHIBITED_TERMS = [
    'free', 'gratis', 'win', 'winner', 'winning', 'prize', 'competition', 'contest', 'giveaway', 'raffle', 'lottery',
    'money back', 'money-back', 'refund', 'guarantee', 'guaranteed',
    'sustainable', 'sustainability', 'eco-friendly', 'green', 'carbon neutral', 'organic', 'recyclable', 'biodegradable',
    'best ever', '#1', 'number one', 'award winning', 'clinically proven', 'scientifically proven',
    'terms and conditions', 't&c', 'terms apply',
    'survey', 'research shows', 'studies show',
    'charity', 'donate', 'donation', 'fundraising',
];

// Safe replacements for common violations
const SAFE_REPLACEMENTS = {
    'sugar-free': 'Zero Sugar',
    'sugar free': 'Zero Sugar',
    'sugarfree': 'Zero Sugar',
    'fat-free': 'Low Fat',
    'fat free': 'Low Fat',
    'fatfree': 'Low Fat',
    'guilt-free': 'Light',
    'guilt free': 'Light',
    'free-range': 'Farm Fresh',
    'free range': 'Farm Fresh',
    'organic': 'Natural',
    'eco-friendly': 'Responsible',
    'sustainable': 'Thoughtful',
    'guarantee': 'Promise',
    'guaranteed': 'Assured',
};

/**
 * Clean text by replacing prohibited terms with safe alternatives
 */
function cleanText(text) {
    if (!text) return '';

    let cleaned = text;

    // Apply safe replacements first (compound terms)
    for (const [prohibited, safe] of Object.entries(SAFE_REPLACEMENTS)) {
        const regex = new RegExp(prohibited, 'gi');
        cleaned = cleaned.replace(regex, safe);
    }

    // Remove any remaining standalone "free"
    cleaned = cleaned.replace(/\bfree\b/gi, '');

    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    return cleaned;
}

/**
 * Check a single text string for compliance violations
 * @returns {object} { isCompliant, violations, cleanedText }
 */
function checkTextCompliance(text) {
    if (!text) return { isCompliant: true, violations: [], cleanedText: '' };

    const lowerText = text.toLowerCase();
    const violations = [];

    // Check for prohibited terms
    for (const term of PROHIBITED_TERMS) {
        if (lowerText.includes(term.toLowerCase())) {
            violations.push({
                term,
                severity: 'error',
                message: `Prohibited term: "${term}"`
            });
        }
    }

    // Check for asterisks (claims indicator)
    if (text.includes('*')) {
        violations.push({
            term: '*',
            severity: 'error',
            message: 'Asterisks (*) are not allowed - they indicate claims that require substantiation'
        });
    }

    // Clean the text
    const cleanedText = cleanText(text);

    return {
        isCompliant: violations.length === 0,
        violations,
        cleanedText,
        wasModified: cleanedText !== text
    };
}

/**
 * Validate a single creative variant for compliance
 * Includes: prohibited terms, headline length (35 chars), subhead words (20 max)
 * @param {object} variant - Creative variant from AI
 * @returns {object} - Variant with compliance status
 */
function validateVariant(variant) {
    const headlineCheck = checkTextCompliance(variant.headline);
    const subheadlineCheck = checkTextCompliance(variant.subheadline);
    const tagCheck = checkTextCompliance(variant.tag);

    const allViolations = [
        ...headlineCheck.violations.map(v => ({ ...v, field: 'headline' })),
        ...subheadlineCheck.violations.map(v => ({ ...v, field: 'subheadline' })),
        ...tagCheck.violations.map(v => ({ ...v, field: 'tag' }))
    ];

    // Get cleaned text
    let cleanedHeadline = headlineCheck.cleanedText || variant.headline || '';
    let cleanedSubheadline = subheadlineCheck.cleanedText || variant.subheadline || '';
    let cleanedTag = tagCheck.cleanedText || variant.tag || 'Only at Tesco';

    let wasModified = headlineCheck.wasModified || subheadlineCheck.wasModified || tagCheck.wasModified;

    // Check headline length (35 chars max)
    const MAX_HEADLINE_LENGTH = 35;
    if (cleanedHeadline.length > MAX_HEADLINE_LENGTH) {
        // Try to smart truncate at word boundary
        const truncated = cleanedHeadline.substring(0, MAX_HEADLINE_LENGTH);
        const lastSpace = truncated.lastIndexOf(' ');
        cleanedHeadline = lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated;
        cleanedHeadline = cleanedHeadline.trim();

        allViolations.push({
            field: 'headline',
            term: 'length',
            severity: 'warning',
            message: `Headline truncated from ${variant.headline.length} to ${cleanedHeadline.length} characters (max ${MAX_HEADLINE_LENGTH})`
        });
        wasModified = true;
    }

    // Check subhead word count (20 words max)
    const MAX_SUBHEAD_WORDS = 20;
    const subheadWords = cleanedSubheadline.trim().split(/\s+/).filter(w => w.length > 0);
    if (subheadWords.length > MAX_SUBHEAD_WORDS) {
        cleanedSubheadline = subheadWords.slice(0, MAX_SUBHEAD_WORDS).join(' ');

        allViolations.push({
            field: 'subheadline',
            term: 'word_count',
            severity: 'warning',
            message: `Subheadline truncated from ${subheadWords.length} to ${MAX_SUBHEAD_WORDS} words`
        });
        wasModified = true;
    }

    const isCompliant = allViolations.filter(v => v.severity === 'error').length === 0;

    return {
        ...variant,
        // Replace with cleaned/truncated versions
        headline: cleanedHeadline,
        subheadline: cleanedSubheadline,
        tag: cleanedTag,
        // Compliance status
        complianceStatus: {
            isCompliant,
            wasModified,
            violations: allViolations,
            originalHeadline: wasModified ? variant.headline : null,
            originalSubheadline: wasModified ? variant.subheadline : null
        }
    };
}

/**
 * Filter and validate all variants in a creative spec
 * This is the main entry point for the compliance filter step
 * 
 * @param {object} creativeSpec - Raw creative spec from AI
 * @returns {object} - Filtered creative spec with compliance info
 */
export function filterCreativeSpec(creativeSpec) {
    if (!creativeSpec || !creativeSpec.variants) {
        return {
            ...creativeSpec,
            complianceChecked: true,
            complianceSummary: {
                totalVariants: 0,
                compliantVariants: 0,
                modifiedVariants: 0,
                failedVariants: 0
            }
        };
    }

    const filteredVariants = creativeSpec.variants.map(validateVariant);

    const compliantCount = filteredVariants.filter(v => v.complianceStatus.isCompliant).length;
    const modifiedCount = filteredVariants.filter(v => v.complianceStatus.wasModified).length;

    return {
        ...creativeSpec,
        variants: filteredVariants,
        complianceChecked: true,
        complianceSummary: {
            totalVariants: filteredVariants.length,
            compliantVariants: compliantCount,
            modifiedVariants: modifiedCount,
            failedVariants: filteredVariants.length - compliantCount,
            allCompliant: compliantCount === filteredVariants.length,
            allModified: modifiedCount > 0
        }
    };
}

/**
 * Quick validation without modification (for UI checks)
 */
export function quickValidate(text) {
    return checkTextCompliance(text);
}

export default {
    filterCreativeSpec,
    validateVariant,
    quickValidate,
    cleanText
};
