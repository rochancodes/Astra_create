// Canvas Helpers - Safe canvas operations with validity checks
// Prevents race conditions and stale closure issues

import useStore from '../store/useStore';

/**
 * Safely execute canvas operations with validity check
 * @param {Function} callback - Function to execute with canvas
 * @returns {*} Result of callback or null if canvas unavailable
 */
export const withCanvas = (callback) => {
    const canvas = useStore.getState().canvas;
    if (!canvas || canvas._disposed) {
        console.warn('⚠️ Canvas not available');
        return null;
    }
    return callback(canvas);
};

/**
 * Get canvas reference safely (for one-time access)
 * @returns {Object|null} Canvas instance or null
 */
export const getCanvas = () => {
    const canvas = useStore.getState().canvas;
    if (!canvas || canvas._disposed) return null;
    return canvas;
};

/**
 * Save to history with validation
 */
export const safeHistorySave = () => {
    return withCanvas(() => {
        const { saveToHistory, updateLayers } = useStore.getState();
        saveToHistory();
        updateLayers();
    });
};

/**
 * Add object to canvas safely
 * @param {Object} fabricObject - Fabric.js object to add
 * @param {Object} options - Options { select: boolean, saveHistory: boolean }
 * @returns {boolean} Success status
 */
export const addToCanvas = (fabricObject, options = {}) => {
    return withCanvas((canvas) => {
        canvas.add(fabricObject);
        if (options.select) {
            canvas.setActiveObject(fabricObject);
        }
        canvas.renderAll();
        if (options.saveHistory !== false) {
            safeHistorySave();
        }
        return true;
    }) || false;
};

/**
 * Remove object from canvas safely
 * @param {Object} fabricObject - Object to remove
 * @param {Object} options - Options { saveHistory: boolean }
 */
export const removeFromCanvas = (fabricObject, options = {}) => {
    return withCanvas((canvas) => {
        canvas.remove(fabricObject);
        canvas.renderAll();
        if (options.saveHistory !== false) {
            safeHistorySave();
        }
        return true;
    }) || false;
};

/**
 * Count packshots on canvas
 * @returns {number} Number of packshot objects
 */
export const getPackshotCount = () => {
    return withCanvas((canvas) => {
        return canvas.getObjects().filter(o => o.isPackshot).length;
    }) || 0;
};

/**
 * Check if canvas has background
 * @returns {boolean}
 */
export const hasBackground = () => {
    return withCanvas((canvas) => {
        return canvas.getObjects().some(o => o.isBackground);
    }) || false;
};

/**
 * Clear all objects except background and safe zones
 */
export const clearCanvasContent = (options = {}) => {
    return withCanvas((canvas) => {
        const toRemove = canvas.getObjects().filter(o =>
            !o.isSafeZone &&
            (options.keepBackground ? !o.isBackground : true)
        );
        toRemove.forEach(o => canvas.remove(o));
        canvas.renderAll();
        if (options.saveHistory !== false) {
            safeHistorySave();
        }
        return true;
    }) || false;
};

export default {
    withCanvas,
    getCanvas,
    safeHistorySave,
    addToCanvas,
    removeFromCanvas,
    getPackshotCount,
    hasBackground,
    clearCanvasContent,
};
