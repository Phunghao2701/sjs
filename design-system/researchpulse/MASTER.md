# ResearchPulse Design System

Status: preview prepared for review.

## Product and direction

- Product: dashboard for students and researchers to discover and monitor scientific publication trends.
- Brand character: clear, trustworthy, academic.
- Visual language: light HyperDataLab blue, flat surfaces, compact dashboard grid, restrained borders and radii.
- Canvas is `#fbfbfb`; cards, inputs, menus, and secondary controls use white surfaces.
- Source of truth: the approved Figma frames and product decisions already recorded in this repository. The generator's unrelated navy palette and serif recommendation are not applied.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--app-bg` | `#fbfbfb` | Main canvas |
| `--surface` | `#ffffff` | Cards and controls |
| `--sidebar-bg` | `#f8f9fa` | Sidebar surface |
| `--ink` | `#171a1e` | Primary text |
| `--muted` | `#626972` | Descriptions and secondary text |
| `--soft-muted` | `#69717a` | Low emphasis metadata on light surfaces |
| `--stroke` | `#e2e5e9` | Main borders |
| `--stroke-soft` | `#e7e9ed` | Dividers |
| `--brand` | `#0879c9` | Primary action and links |
| `--brand-hover` | `#0669af` | Primary action hover |
| `--hover` | `#F5F5F5` | Hover and neutral selected surface |

Status colors are reserved for real success, warning, and error states. Keep metadata readable against the light canvas; use lighter grays for non-text borders and decorative marks only.

## Typography

Use Inter with system fallbacks. Do not add a second typeface.

| Role | Size | Weight |
| --- | ---: | ---: |
| Page title | 27px | 600 |
| Section title | 16px | 600 |
| Page content | 16px | 400 |
| Description | 13px | 400 |
| Button | 14px | 500 |
| Sidebar item | 13px | 400 |
| Sidebar description | 10.5px | 400 |
| Metadata | 11px | 400 |

## Spacing, shape, and elevation

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, and 40px.
- Main controls use a 7px radius; the search bar uses 6px; cards use 9px; dialog surfaces use 8px.
- Borders are 1px and use `--stroke` or `--stroke-soft`.
- Content cards have no shadow. Popovers and dialogs may use `--shadow-overlay`.
- Hover and focus treatments stay compact; hover changes the surface color without changing label color. Keyboard focus remains clearly visible.

## Component contract

1. **Button:** outline, primary, secondary, and ghost. Default height 36px in MUI; 14px label. Surface buttons stay white; primary is reserved for the main action. No icon unless the approved Figma design specifies one.
2. **Status badge:** compact text label with a semantic tint; no decorative icon.
3. **Input:** 40px default height, 1px border, 7px radius; on focus, the existing border changes to `--muted` without an outer ring. Search bars and create-project form fields keep their Figma-specific 49px and 44px heights.
4. **Card:** white surface, 1px border, 9px radius, no shadow.
5. **List row:** at least 40px high, content may increase height, 1px separators, neutral hover background; hover does not recolor text.
6. **Dialog:** MUI Dialog, up to 560px wide, actions aligned right; close through Escape or its cancel action. Backdrop click follows MUI's default unless a future flow explicitly needs a dirty-state guard.
7. **Empty state:** concise text with no illustration or icon by default. Add a text link only when the user needs a direct way out of an active filter.

## Layout and responsive behavior

- Desktop app shell uses a fixed sidebar and one primary content region.
- Search and overview content follow a grid; the overview fits the viewport at desktop sizes, with scrolling kept inside result panels where specified by Figma.
- On narrow screens, grids collapse to one column and the page may scroll vertically.
- Keep the sidebar labels and descriptions at their specified sizes; do not add navigation categories without product direction.

## Icons and motion

- Do not add icons absent from the approved Figma frames. Use the existing Heroicons setup only where a frame already specifies an icon.
- Use Motion only for purposeful page transitions. Keep local state changes subtle and honor `prefers-reduced-motion`.
- Motion tokens: 150ms fast, 200ms standard, `cubic-bezier(0.2, 0, 0, 1)`.

## Accessibility

- All interactive elements must be keyboard reachable and have a visible focus state.
- Pair inputs with labels and present validation text next to the affected field.
- Keep essential text at accessible contrast; reserve `--soft-muted` for nonessential metadata.
- Respect reduced motion.

## Implementation

- CSS variables live in `src/design-system/tokens.css`.
- MUI defaults live in `src/theme.ts`.
- The review page is served at `/design-system` and uses the same MUI components and tokens.
- Existing components and screen layouts are not refactored by this system-only feature.
