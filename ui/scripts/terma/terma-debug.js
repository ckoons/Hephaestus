/**
 * Terma Debug Helper
 * 
 * This script helps diagnose issues with the Terma terminal component
 * by providing enhanced logging and diagnostics
 */

console.log('[Terma Debug] Debug script loaded');

// Patch the fetch API to log Terma component file loading attempts
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('terma')) {
        console.log(`[Terma Debug] Fetch attempt: ${url}`);
    }
    return originalFetch.apply(this, arguments)
        .then(response => {
            if (typeof url === 'string' && url.includes('terma')) {
                console.log(`[Terma Debug] Fetch result for ${url}: ${response.status} ${response.ok ? 'OK' : 'Failed'}`);
            }
            return response;
        })
        .catch(error => {
            if (typeof url === 'string' && url.includes('terma')) {
                console.error(`[Terma Debug] Fetch error for ${url}:`, error);
            }
            throw error;
        });
};

// Patch the createElement API to track script loading
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
    const element = originalCreateElement.apply(this, arguments);
    if (tagName.toLowerCase() === 'script') {
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function(name, value) {
            if (name === 'src' && value.includes('terma')) {
                console.log(`[Terma Debug] Script loading attempt: ${value}`);
                
                const originalOnLoad = element.onload;
                element.onload = function() {
                    console.log(`[Terma Debug] Script loaded successfully: ${value}`);
                    if (originalOnLoad) originalOnLoad.apply(this, arguments);
                };
                
                const originalOnError = element.onerror;
                element.onerror = function(error) {
                    console.error(`[Terma Debug] Script loading failed: ${value}`, error);
                    if (originalOnError) originalOnError.apply(this, arguments);
                };
            }
            return originalSetAttribute.apply(this, arguments);
        };
    }
    return element;
};

// Add a global error handler to catch any Terma-related errors
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('terma')) {
        console.error(`[Terma Debug] Error in ${event.filename}:${event.lineno}:${event.colno}`, event.error);
    }
});

// Add a click handler for the Terma tab
document.addEventListener('DOMContentLoaded', function() {
    const termaTab = document.querySelector('.nav-item[data-component="terma"]');
    if (termaTab) {
        console.log('[Terma Debug] Found Terma tab in DOM');
        termaTab.addEventListener('click', function() {
            console.log('[Terma Debug] Terma tab clicked');
            
            // Check if the loadTermaComponent function is defined
            if (window.uiManager && typeof window.uiManager.loadTermaComponent === 'function') {
                console.log('[Terma Debug] loadTermaComponent function found in uiManager');
            } else {
                console.error('[Terma Debug] loadTermaComponent function NOT found in uiManager');
            }
            
            // Check elements after a brief delay
            setTimeout(() => {
                const htmlPanel = document.getElementById('html-panel');
                const termaContainer = document.getElementById('terma-container');
                
                console.log('[Terma Debug] HTML panel exists:', !!htmlPanel);
                console.log('[Terma Debug] Terma container exists:', !!termaContainer);
                
                if (termaContainer) {
                    console.log('[Terma Debug] Terma container content:', termaContainer.innerHTML.substring(0, 100) + '...');
                }
            }, 500);
        });
    } else {
        console.error('[Terma Debug] Could not find Terma tab in DOM');
    }
});