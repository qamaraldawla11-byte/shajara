# Shajara Performance Report

Audit date: 2026-05-16

## Build Status

Final production build completed successfully with Vite.

## Bundle Improvements

Before manual chunking, the primary app chunk was approximately:

- `index`: 453.88 kB raw, 133.75 kB gzip

After manual chunking:

- `index`: 24.00 kB raw, 8.26 kB gzip
- `react`: 165.89 kB raw, 54.28 kB gzip
- `supabase`: 206.59 kB raw, 53.31 kB gzip
- `i18n`: 57.14 kB raw, 18.71 kB gzip
- `tree`: 147.38 kB raw, 48.41 kB gzip

The total application code is still comparable, but startup parsing is improved because large vendor areas are isolated and browser caching is more effective.

## Optimizations Applied

- Preserved route-level lazy loading for primary pages.
- Preserved lazy loading for the advanced tree renderer.
- Added vendor chunk splitting for React, Supabase, i18n, and React Flow.
- Added reusable loading states to reduce layout jitter and duplicated markup.
- Kept production sourcemaps disabled.
- Reduced decorative login rendering overhead.

## Current Bottlenecks

- Supabase JS is a large dependency and should remain vendor-cached.
- React Flow is large and should stay isolated to tree routes.
- Large CSS file could be split later by route or feature if initial CSS becomes a measurable bottleneck.
- Images uploaded to storage should be constrained and transformed before display.

## Recommended Next Steps

- Add Lighthouse CI for mobile performance budgets.
- Add route-level prefetching for likely next actions after login.
- Add image resizing and format rules for member photos.
- Add e2e performance checks for dashboard, family page, and advanced tree page.

