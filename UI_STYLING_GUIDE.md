# Tekton UI Styling Guide

## Effective UI Development Strategies (April 2025)

### Browser Cache Management

The browser cache is the main source of frustration during UI development. To manage browser caching effectively:

1. **Force cache refresh** with one of these methods:
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
   - Use Chrome DevTools: Network tab → Disable cache (when DevTools is open)
   - Use incognito/private browser window for testing

2. **Server cache control headers:**
   - The HTTP server has been modified to include no-cache headers:
   ```
   Cache-Control: no-cache, no-store, must-revalidate
   Pragma: no-cache
   Expires: 0
   ```

### CSS Styling Approaches

For guaranteed style application:

1. **Inline styles with !important**
   - Most reliable way to ensure styles are applied
   - Example: `style="font-size: 0.9rem !important; color: blue !important;"`
   - Use sparingly as it makes future maintenance more difficult

2. **Image path management**
   - Local UI images should be placed in: `/Hephaestus/ui/images/`
   - Reference them with relative paths: `images/filename.png`
   - Consider using `onerror` fallbacks for images: 
     ```html
     <img src="images/main.png" onerror="this.src='images/fallback.png'; this.onerror=null;">
     ```

3. **CSS Organization**
   - Main styles are in: `/Hephaestus/ui/styles/main.css`
   - Theme styles in: `/Hephaestus/ui/styles/themes/dark.css`
   - Component-specific styles in: `/Hephaestus/ui/styles/[component].css`

### Text Handling in Navigation

For components with long names in the navigation:

1. **Use flex layout** to give more structure:
   ```html
   <span class="nav-label" style="display: flex; align-items: center;">
     <span style="font-size: 0.9rem;">Main Name</span>
     <span> - </span>
     <span style="font-size: 0.7rem; opacity: 0.8;">Longer Description</span>
   </span>
   ```

2. **Apply consistent sizing** to navigation items:
   - Primary component name: `0.9rem`
   - Subcomponent descriptions: `0.7rem`
   - Use opacity (0.8-0.85) for visual hierarchy

### Testing UI Changes

1. Kill all Tekton processes before starting:
   ```bash
   cd /Users/cskoons/projects/github/Tekton && ./scripts/tekton_kill
   ```

2. Launch only Hephaestus for UI development:
   ```bash
   cd /Users/cskoons/projects/github/Tekton/Hephaestus && ./run_ui.sh
   ```

3. Make one change at a time, verify in browser, then proceed
4. Use Chrome Developer Tools to inspect and test styles interactively

### Current Styling Decisions

- Header title: Blue (#007bff), 2.5rem
- Subtitle: Light gray (#aaa), 0.9rem
- Left panel background: Black (#000000)
- Icon positioning: Absolute right-aligned and full-height
- Navigation: Components with longer names use smaller fonts for descriptions