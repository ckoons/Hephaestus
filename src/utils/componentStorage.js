/**
 * Simple component input storage using localStorage
 * This ensures input context persists even on page reload
 */

// Get input context for a component
export const getInputContext = (componentId) => {
  try {
    const storageKey = `tekton_input_${componentId}`;
    const storedValue = localStorage.getItem(storageKey);
    console.log(`[Storage] Getting input for component: ${componentId}`, storedValue ? `(${storedValue.length} chars)` : '(empty)');
    return storedValue || '';
  } catch (e) {
    console.error(`[Storage] Error getting input for ${componentId}:`, e);
    return '';
  }
};

// Save input context for a component
export const saveInputContext = (componentId, text) => {
  try {
    const storageKey = `tekton_input_${componentId}`;
    if (text && text.trim()) {
      localStorage.setItem(storageKey, text);
      console.log(`[Storage] Saved input for component: ${componentId} (${text.length} chars)`);
    } else {
      localStorage.removeItem(storageKey);
      console.log(`[Storage] Cleared input for component: ${componentId}`);
    }
    return true;
  } catch (e) {
    console.error(`[Storage] Error saving input for ${componentId}:`, e);
    return false;
  }
};

// Clear input context for a component
export const clearInputContext = (componentId) => {
  try {
    const storageKey = `tekton_input_${componentId}`;
    localStorage.removeItem(storageKey);
    console.log(`[Storage] Cleared input for component: ${componentId}`);
    return true;
  } catch (e) {
    console.error(`[Storage] Error clearing input for ${componentId}:`, e);
    return false;
  }
};

// Get all stored component input contexts
export const getAllInputContexts = () => {
  try {
    const contexts = {};
    
    // Iterate through localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tekton_input_')) {
        const componentId = key.replace('tekton_input_', '');
        contexts[componentId] = localStorage.getItem(key) || '';
      }
    }
    
    console.log(`[Storage] Got all input contexts:`, Object.keys(contexts));
    return contexts;
  } catch (e) {
    console.error(`[Storage] Error getting all contexts:`, e);
    return {};
  }
};
EOF < /dev/null