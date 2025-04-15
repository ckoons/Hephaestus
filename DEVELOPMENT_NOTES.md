# Tekton UI Development Notes

## Current Status (April 15, 2025)

We've been working on improving the Hephaestus UI component for Tekton. The following are key points and instructions for continuing development.

### What We've Done So Far

1. **Fixed the Kill/Launch Scripts**
   - Added robust port-based process termination to `kill-tekton.sh`
   - Added port verification before launching in `launch-tekton.sh`
   - This ensures clean restarts without port conflicts

2. **Made Some UI Adjustments**
   - Reduced font sizes in left panel
   - Adjusted spacing and layout in the title area

### Known Issues

1. **Image Display**
   - The Tekton.png icon in the left panel header doesn't display properly
   - Current path is: `<img src="../../images/Tekton.png" alt="Tekton Pillar" class="pillar-icon">`

2. **Text Layout**
   - The "Multi-AI Engineering" subtitle sometimes wraps
   - The "Ergon - Agents/Workflows/Tools" label is too long for the left panel

3. **Browser Caching**
   - Changes to CSS files are often not reflected due to browser caching
   - Need to use cache-busting or hard refresh (Cmd+Shift+R) to see changes

### Priorities for Next Development Session

1. **Fix the Left Panel Header**
   - Make the Tekton logo/icon display correctly
   - Properly size and position the subtitle text
   - Ensure consistent styling across browsers

2. **Improve Navigation Labels**
   - Ensure long component names like "Ergon - Agents/Workflows/Tools" fit properly
   - Consider abbreviations or smaller fonts for longer names

3. **Add Basic Cache Busting**
   - Implement a simple timestamp-based query parameter for CSS and JS files
   - Test any changes immediately to verify they appear as expected

## Development Guidelines

### Methodical Approach

1. **Make ONE change at a time**
   - Change one component, one CSS property, or one element at a time
   - Always verify that each individual change works before proceeding

2. **Test-Driven Development**
   - After each change, restart Tekton using the launch script
   - Verify the change is visible and works as expected
   - Use browser inspection tools to debug CSS issues

3. **Browser Cache Management**
   - Use incognito/private window for testing changes
   - Add random query parameters to force cache refresh (e.g., `?v=12345`)
   - Hard refresh (Cmd+Shift+R / Ctrl+F5) to bypass cache

### UI Development Process

1. Start with the Tekton kill script to ensure clean shutdown:
   ```bash
   cd /Users/cskoons/projects/github/Tekton && ./kill-tekton.sh
   ```

2. Make a SINGLE change to a CSS or HTML file:
   ```bash
   # Example: Adjust font size
   # Edit /Users/cskoons/projects/github/Tekton/Hephaestus/ui/styles/main.css
   ```

3. Launch Tekton with just the Hephaestus component:
   ```bash
   cd /Users/cskoons/projects/github/Tekton && ./launch-tekton.sh --components hephaestus --non-interactive
   ```

4. Test in browser (with cache disabled):
   - Access `http://localhost:8080`
   - Use hard refresh (Cmd+Shift+R) to bypass cache
   - Verify the change appears as expected

5. Document what worked and what didn't before proceeding to the next change

## Next Steps and Specific Tasks

### 1. Fix the Logo/Icon Display

Investigate the image path and make sure it correctly points to the Tekton.png file:
- Check for the correct path from the UI's perspective
- Consider using absolute paths or adjusting the relative path
- Add fallback with the `onerror` attribute to use a different icon if the primary one fails

### 2. Improve Text Sizing

Adjust the CSS for the subtitle and navigation elements:
- Reduce font size for the "Multi-AI Engineering" subtitle
- Create specific CSS rules for longer component names
- Ensure consistent text handling across different browsers

### 3. Implement Simple Cache Busting

Add a cache-busting mechanism that doesn't rely on a complex build process:
- Consider a simple timestamp or version query parameter
- Implement in a way that doesn't break the existing script loading order
- Test thoroughly to ensure it works consistently

Remember: Make ONE change, test it, and then proceed. This methodical approach will lead to a more stable and predictable development process.