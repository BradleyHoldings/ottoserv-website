# OttoServ Design System

## Overview

OttoServ's design system prioritizes operational clarity, professional trust, and efficient workflows for service business automation. The visual language reflects intelligence, reliability, and premium quality while avoiding generic AI SaaS aesthetics.

## Colors

### Primary Palette
```css
:root {
  /* Primary Brand Colors */
  --otto-blue-50: #f0f7ff;
  --otto-blue-100: #ddeeff;
  --otto-blue-200: #b8deff;
  --otto-blue-300: #78c5ff;
  --otto-blue-400: #2fa6ff;
  --otto-blue-500: #0084ff;  /* Primary brand blue */
  --otto-blue-600: #0066cc;
  --otto-blue-700: #0052a3;
  --otto-blue-800: #003d7a;
  --otto-blue-900: #002952;

  /* Operational Grays (warm-tinted) */
  --otto-gray-50: #fafafa;
  --otto-gray-100: #f4f4f5;
  --otto-gray-200: #e4e4e7;
  --otto-gray-300: #d4d4d8;
  --otto-gray-400: #a1a1aa;
  --otto-gray-500: #71717a;
  --otto-gray-600: #52525b;
  --otto-gray-700: #3f3f46;
  --otto-gray-800: #27272a;
  --otto-gray-900: #18181b;

  /* Success/Error/Warning */
  --otto-green-500: #10b981;
  --otto-green-600: #059669;
  --otto-red-500: #ef4444;
  --otto-red-600: #dc2626;
  --otto-amber-500: #f59e0b;
  --otto-amber-600: #d97706;
}
```

### Color Usage Guidelines
- **Primary Blue**: CTAs, primary actions, active states, brand elements
- **Warm Grays**: Text, borders, backgrounds (never pure black/white)
- **Success Green**: Completed tasks, positive states, confirmations
- **Error Red**: Alerts, destructive actions, error states
- **Warning Amber**: Cautions, pending states, important notices

### Dark Mode
```css
[data-theme="dark"] {
  --otto-bg-primary: #0c0c0f;
  --otto-bg-secondary: #16161b;
  --otto-bg-tertiary: #21212a;
  --otto-text-primary: #f4f4f5;
  --otto-text-secondary: #a1a1aa;
  --otto-border: #3f3f46;
}
```

## Typography

### Font Stack
```css
:root {
  /* Primary: Professional sans-serif, NOT Inter */
  --font-primary: "Source Sans Pro", "Segoe UI", system-ui, sans-serif;
  
  /* Secondary: Slightly more personality for headings */
  --font-secondary: "Nunito Sans", "Source Sans Pro", system-ui, sans-serif;
  
  /* Monospace: Code, technical data */
  --font-mono: "JetBrains Mono", "Fira Code", Consolas, monospace;
}
```

### Type Scale (Modular - 1.25 ratio)
```css
:root {
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 2.813rem;   /* 45px */
}
```

### Typography Rules
- **Headlines**: font-secondary, bold weight, tight line-height (1.1)
- **Body Text**: font-primary, normal weight, comfortable line-height (1.6)
- **UI Labels**: font-primary, medium weight, compact line-height (1.4)
- **Data/Numbers**: font-mono for precise alignment
- **Never**: Pure black text (always tinted with brand colors)

## Spacing & Layout

### Spacing Scale (8px base unit)
```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### Layout Grid
- **Desktop**: 12-column grid, max-width 1200px
- **Tablet**: 8-column grid, adaptive margins
- **Mobile**: 4-column grid, 16px margins
- **Component spacing**: Use consistent spacing scale
- **Never**: Arbitrary spacing values outside the scale

## Components

### Cards
```css
.card {
  background: var(--otto-bg-secondary);
  border: 1px solid var(--otto-border);
  border-radius: 8px;
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Never nest cards inside cards */
.card .card { /* Forbidden pattern */ }
```

### Buttons
```css
.btn-primary {
  background: var(--otto-blue-500);
  color: white;
  border-radius: 6px;
  padding: var(--space-3) var(--space-6);
  font-weight: 500;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: var(--otto-blue-600);
  transform: translateY(-1px);
}

/* No bounce/elastic easing - use ease or ease-out */
```

### Tables
```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.table th {
  background: var(--otto-gray-50);
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid var(--otto-border);
}

.table td {
  padding: var(--space-4);
  border-bottom: 1px solid var(--otto-border);
}
```

### Forms
```css
.form-input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--otto-gray-300);
  border-radius: 4px;
  font-size: var(--text-base);
  transition: border-color 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--otto-blue-500);
  box-shadow: 0 0 0 3px rgba(0, 132, 255, 0.1);
}
```

## Navigation

### Dashboard Navigation
- **Sidebar**: Fixed width 280px, collapsible to 64px icons
- **Top bar**: 64px height, right-aligned user controls
- **Breadcrumbs**: Clear hierarchy, clickable path elements
- **Tab navigation**: Consistent spacing, clear active states

### Mobile Navigation
- **Bottom navigation**: 4-5 primary sections
- **Hamburger menu**: For secondary actions
- **Swipe gestures**: For common navigation patterns

## Responsive Design

### Breakpoints
```css
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}
```

### Responsive Strategy
- **Mobile-first**: Start with mobile, enhance for larger screens
- **Progressive disclosure**: Show more information as space allows
- **Touch targets**: Minimum 44px for interactive elements
- **Fluid typography**: Scale text sizes between breakpoints

## Accessibility

### Requirements
- **WCAG 2.1 AA compliance** minimum standard
- **Color contrast**: 4.5:1 for normal text, 3:1 for large text
- **Focus indicators**: Visible focus rings on all interactive elements
- **Screen reader support**: Proper ARIA labels and structure
- **Keyboard navigation**: Full functionality without mouse

### Accessibility Patterns
```css
/* Focus ring pattern */
:focus-visible {
  outline: 2px solid var(--otto-blue-500);
  outline-offset: 2px;
}

/* Screen reader only text */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

## State Management

### Loading States
- **Skeleton screens**: For content that's loading
- **Progressive loading**: Show partial content while loading more
- **Loading spinners**: For actions and short waits
- **No blocking overlays**: Unless absolutely necessary

### Empty States
- **Helpful guidance**: Clear next steps for users
- **Visual hierarchy**: Important actions prominently placed
- **Contextual help**: Explain why the area is empty

### Error States
- **Clear messaging**: Explain what went wrong
- **Recovery actions**: Tell users how to fix the issue
- **Visual distinction**: Red borders/backgrounds for errors
- **Inline validation**: Real-time feedback for forms

## Motion Design

### Animation Principles
- **Purposeful**: Every animation should serve a function
- **Quick**: No longer than 300ms for UI feedback
- **Smooth**: Use easing curves (ease-out, ease)
- **Reduced motion**: Respect user preferences

### Easing Functions
```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Avoid this */
}
```

## Anti-Patterns (Do NOT Use)

### Visual Anti-Patterns
- ❌ **Nested cards**: Cards inside cards create visual confusion
- ❌ **Gray text on colored backgrounds**: Reduces readability
- ❌ **Pure black/white**: Always tint with brand colors
- ❌ **Bounce/elastic easing**: Feels dated and unprofessional
- ❌ **Purple gradients**: Overused in AI/SaaS products
- ❌ **Excessive glassmorphism**: Reduces clarity

### Layout Anti-Patterns
- ❌ **Cramped padding**: Insufficient whitespace
- ❌ **Inconsistent spacing**: Using arbitrary values
- ❌ **Cluttered tables**: Too much information density
- ❌ **Generic dashboard grids**: Cookie-cutter layouts

### Typography Anti-Patterns
- ❌ **Inter font**: Overused, choose Source Sans Pro instead
- ❌ **Too many font weights**: Stick to 400, 500, 600, 700
- ❌ **Poor hierarchy**: Unclear information structure
- ❌ **Small touch targets**: Below 44px minimum

## CRM/Dashboard Patterns

### Data Tables
- **Sortable headers**: Clear visual indicators
- **Filters**: Easy access, persistent state
- **Pagination**: Clear navigation, show total count
- **Row actions**: Consistent placement, clear icons
- **Bulk operations**: Checkbox selection, batch actions

### Dashboard Widgets
- **Consistent sizing**: Use grid system
- **Clear metrics**: Large numbers, contextual labels
- **Trend indicators**: Visual direction indicators
- **Drill-down capability**: Click to see details
- **Real-time updates**: Show data freshness

### Workflow States
- **Progress indicators**: Clear step visualization
- **Status badges**: Consistent color coding
- **Action buttons**: Context-appropriate options
- **History tracking**: Audit trail visibility

## Implementation Guidelines

### CSS Architecture
- **CSS Custom Properties**: Use variables for consistency
- **Utility classes**: For common patterns
- **Component classes**: For complex components
- **No inline styles**: Keep styles in CSS files

### Performance
- **Optimize images**: Use appropriate formats and sizes
- **Minimize CSS**: Remove unused styles
- **Efficient selectors**: Avoid deep nesting
- **Progressive enhancement**: Core functionality first

This design system serves as the foundation for all OttoServ interfaces, ensuring consistency, professionalism, and operational efficiency across all user touchpoints.