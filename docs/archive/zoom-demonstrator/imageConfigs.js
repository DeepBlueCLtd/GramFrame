/**
 * Image Configuration Module
 * 
 * Centralized configuration for test images used in the zoom demonstrator
 * 
 * @typedef {import('./types.js').TestImageConfig} TestImageConfig
 * @typedef {import('./types.js').TestImageConfigs} TestImageConfigs
 */

/**
 * Test image configurations
 * @type {TestImageConfigs}
 */
export const testImageConfigs = {
    'offset': {
        src: '../sample/test-image-offset-axes.png',
        dataRange: { minX: 100, maxX: 900, minY: 100, maxY: 500 },
        nativeWidth: 1000,
        nativeHeight: 500,
        description: 'Offset Axes (100-900 Hz, 100-500 time)'
    },
    'original': {
        src: '../sample/test-image.png', 
        dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
        nativeWidth: 800,
        nativeHeight: 400,
        description: 'Original (0-800 Hz, 0-400 time)'
    },
    'scaled': {
        src: '../sample/test-image-scaled.png',
        dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
        nativeWidth: 900,
        nativeHeight: 300,
        description: 'Scaled (0-800 Hz, 0-400 time)'
    },
    'mock': {
        src: '../sample/mock-gram.png',
        dataRange: { minX: 0, maxX: 150, minY: 0, maxY: 60 },
        nativeWidth: 902,
        nativeHeight: 237,
        description: 'Mock Gram (0-150 Hz, 0-60 s)'
    }
};

/**
 * Get image configuration by key
 * @param {string} imageKey - Image configuration key
 * @returns {TestImageConfig} Image configuration
 */
export function getImageConfig(imageKey) {
    const config = testImageConfigs[imageKey];
    if (!config) {
        throw new Error(`Unknown image configuration: ${imageKey}`);
    }
    return config;
}

/**
 * Get all available image keys
 * @returns {string[]} Array of image configuration keys
 */
export function getAvailableImageKeys() {
    return Object.keys(testImageConfigs);
}

/**
 * Get default image key
 * @returns {string} Default image key
 */
export function getDefaultImageKey() {
    return 'offset'; // Default to offset-axes as specified
}