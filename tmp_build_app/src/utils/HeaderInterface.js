import store from '../store';
import { setHeaderControls } from '../store/slices/headerSlice';

/**
 * Interface for Component AIs to interact with the RIGHT HEADER
 */
const HeaderInterface = {
  /**
   * Sets custom controls for the component in the header
   * @param {string} componentId - The ID of the component
   * @param {Array} controls - Array of control objects to render in the header
   * Each control object should have: 
   * - icon: The icon component to display
   * - label: Optional tooltip text
   * - onClick: Function to execute when clicked
   * - color: Optional color for the button
   */
  setControls: (componentId, controls) => {
    console.log(`[Header Interface] Setting ${controls.length} controls for component: ${componentId}`);
    store.dispatch(setHeaderControls({ componentId, controls }));
  },

  /**
   * Clears custom controls for the component in the header
   * @param {string} componentId - The ID of the component
   */
  clearControls: (componentId) => {
    console.log(`[Header Interface] Clearing controls for component: ${componentId}`);
    store.dispatch(setHeaderControls({ componentId, controls: [] }));
  }
};

export default HeaderInterface;