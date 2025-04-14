import store from '../store';
import { saveInputContext, setPlaceholder } from '../store/slices/footerSlice';

/**
 * Interface for Component AIs to interact with the RIGHT FOOTER/ChatInput
 */
const FooterInterface = {
  /**
   * Saves the current input context for a component
   * @param {string} componentId - The ID of the component
   * @param {string} inputText - The text to save
   */
  saveInputContext: (componentId, inputText) => {
    console.log(`[Footer Interface] Saving input context for component: ${componentId}`, 
               `(length: ${inputText ? inputText.length : 0})`);
    store.dispatch(saveInputContext({ componentId, inputText }));
  },

  /**
   * Sets a custom placeholder for the input field
   * @param {string} componentId - The ID of the component
   * @param {string} placeholder - The placeholder text
   */
  setPlaceholder: (componentId, placeholder) => {
    console.log(`[Footer Interface] Setting placeholder for component: ${componentId}`, placeholder);
    store.dispatch(setPlaceholder({ componentId, placeholder }));
  },

  /**
   * Gets the saved input context for a component
   * @param {string} componentId - The ID of the component
   * @returns {string} The saved input text or empty string if none exists
   */
  getInputContext: (componentId) => {
    const state = store.getState();
    const savedContext = state.footer.inputContexts[componentId] || '';
    console.log(`[Footer Interface] Getting input context for component: ${componentId}`,
               `(has context: ${savedContext.length > 0})`);
    return savedContext;
  }
};

export default FooterInterface;