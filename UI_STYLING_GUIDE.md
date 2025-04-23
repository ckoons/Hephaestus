# Tekton UI Styling Guide

## Overview

This guide provides best practices for styling Tekton UI components for consistency and maintainability across the Hephaestus UI system.

## General Principles

1. **Consistency**: Use consistent styles, spacing, and typography across all components
2. **Accessibility**: Ensure all UI elements meet WCAG 2.1 AA standards
3. **Performance**: Minimize CSS specificity and DOM manipulations
4. **Maintainability**: Use semantic class names and component-based CSS
5. **Responsiveness**: Design for various screen sizes and device types

## CSS Organization

### Structure

Organize CSS files according to component boundaries:

```
/Hephaestus
  /ui
    /styles
      /main.css              # Global styles and variables
      /terminal-chat.css     # Terminal chat styles
      /themes/               # Theme variations
        /dark.css
        /light.css
      /components/           # Component-specific styles
        /terminal.css
        /ergon.css
        /profile.css
```

### Naming Conventions

Use a modified BEM (Block-Element-Modifier) methodology:

```css
/* Block: represents a component */
.terma-terminal { }

/* Element: a part of the block */
.terma-terminal__header { }
.terma-terminal__content { }

/* Modifier: a variation or state */
.terma-terminal--expanded { }
.terma-terminal--dark-theme { }
```

### Variables

Define CSS variables in the root or theme scope:

```css
:root {
  /* Typography */
  --font-family-mono: 'Consolas', 'Courier New', monospace;
  --font-family-sans: 'Segoe UI', 'Helvetica Neue', sans-serif;
  --font-size-small: 0.875rem;
  --font-size-base: 1rem;
  --font-size-large: 1.25rem;
  
  /* Colors */
  --color-primary: #3b80f7;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
  --color-info: #17a2b8;
  --color-light: #f8f9fa;
  --color-dark: #212529;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```

## Component Guidelines

### Headers and Navigation

- Use fixed height (64px) for headers
- Maintain consistent vertical alignment for all header elements
- Include appropriate spacing between navigation items (16px)
- Use subtle hover effects for interactive elements
- Long component names should truncate with ellipsis

### Content Areas

- Use a minimum 16px padding for content containers
- Maintain a consistent maximum width for optimal readability (1200px)
- Use grid or flexbox layouts for complex content structures
- Include appropriate loading states for async content

### Terminal Components

- Use monospace fonts for all terminal text
- Maintain consistent padding in terminal containers (12px)
- Use subtle borders to separate terminal sections
- Include visible indicators for active terminal sessions
- Ensure sufficient contrast for terminal text (4.5:1 minimum)

### Forms and Controls

- Maintain consistent form element heights (32px for inputs)
- Use appropriate focus states for interactive elements
- Group related form controls with consistent spacing
- Include visible validation states
- Use appropriate cursor styles for interactive elements

## Browser Cache Management

### Cache Control Headers

Set appropriate cache control headers for static assets:

```
Cache-Control: max-age=3600, must-revalidate
```

For dynamic content that changes frequently:

```
Cache-Control: no-cache, must-revalidate
```

### Asset Versioning

Use file content hashing for CSS and JS files to invalidate cache when content changes:

```html
<link rel="stylesheet" href="/styles/main.css?v=2025041501">
<script src="/scripts/terminal.js?v=2025041501"></script>
```

Consider implementing a build process that automatically updates version numbers based on file changes.

## Image Handling

### Path Management

- Store component-specific images in the component's directory
- Use relative paths for component images:
  ```css
  .component-icon {
    background-image: url('../images/icon.png');
  }
  ```
- For shared images, use absolute paths from the Tekton root:
  ```css
  .tekton-logo {
    background-image: url('/images/Tekton.png');
  }
  ```

### Fallback Strategies

Implement image fallbacks with CSS:

```css
.component-icon {
  background-image: url('../images/icon.png');
  background-image: url('/images/fallback-icon.png');
}
```

Or use JavaScript for more complex fallbacks:

```javascript
img.onerror = function() {
  this.src = '/images/fallback-icon.png';
  this.classList.add('fallback-image');
}
```

### Optimization

- Use appropriate image formats (SVG for icons, WebP with PNG fallback for photos)
- Optimize image sizes with tools like ImageOptim
- Consider lazy loading for images below the fold
- Include width and height attributes to prevent layout shifts

## Text Handling

### Truncation

Use CSS for text truncation:

```css
.component-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
```

For multi-line truncation:

```css
.description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### Internationalization

- Use relative units (rem, em) for text sizing to respect user settings
- Allow text elements to expand for longer translated text
- Avoid hard-coded widths for text containers
- Use CSS `dir` attribute and logical properties for RTL support

## Accessibility

- Use semantic HTML elements
- Include proper ARIA attributes for custom components
- Ensure keyboard navigation works for all interactive elements
- Maintain color contrast ratios of at least 4.5:1 for text
- Provide focus styles for all interactive elements

## Performance Considerations

- Minimize CSS specificity to reduce rendering time
- Use CSS transitions instead of JavaScript animations when possible
- Implement critical CSS to improve initial render time
- Use `will-change` cautiously for elements with animations
- Consider using `contain` for layout isolation

## Example Implementation

A well-structured terminal component CSS would look like:

```css
/* Terminal component base */
.terma-terminal {
  font-family: var(--font-family-mono);
  color: var(--terminal-text-color);
  background-color: var(--terminal-bg-color);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  position: relative;
}

/* Terminal component elements */
.terma-terminal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.terma-terminal__toolbar {
  display: flex;
  gap: var(--spacing-sm);
}

.terma-terminal__content {
  min-height: 300px;
  overflow: auto;
}

/* Terminal component modifiers */
.terma-terminal--expanded {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  border-radius: 0;
}

/* Terminal component themes */
.theme-dark .terma-terminal {
  --terminal-text-color: #f8f8f2;
  --terminal-bg-color: #282a36;
}

.theme-light .terma-terminal {
  --terminal-text-color: #333;
  --terminal-bg-color: #f5f5f5;
}
```

## Integration with Hephaestus

When integrating components with Hephaestus:

1. Include a dedicated CSS file with component scoped styles
2. Use the component's namespace for all CSS classes
3. Define theme compatibility with Hephaestus themes
4. Include both light and dark theme variations
5. Test responsiveness across different viewports

## Testing Your Styles

- Verify your component in both light and dark themes
- Test across different browsers (Chrome, Firefox, Safari, Edge)
- Verify responsiveness on mobile, tablet, and desktop viewports
- Validate accessibility with tools like Axe or Lighthouse
- Test with different font sizes and zoom levels