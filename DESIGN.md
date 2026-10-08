# Implemented design — Unit desk

## Overview

Unit desk is a focused Ethereum unit converter for someone holding a wei amount who needs its exact gwei and ETH equivalents. The implemented direction is a quiet light surface, dark green ink, monospaced numbers, and two clearly numbered steps: input, then results. The gwei result has a pale green surface; Ether uses a neutral surface. They are outputs, not primary-action buttons.

Source of truth: `web/src/styles.css` for tokens and responsive rules, `web/src/main.tsx` for composition and components, and `web/src/conversion.ts` for accepted values. This is a single English page with one light theme. There is no existing brand being represented. No images, webfonts, or icon libraries are fetched.

## Colors

The canonical format is sRGB hex. Primitives are declared at the top of `web/src/styles.css`; components use semantic tokens.

| Semantic token | Exact value | Role |
| --- | --- | --- |
| `--bg-page` | `#f6f7f4` | Page and neutral result |
| `--bg-surface` | `#ffffff` | Calculator and input |
| `--bg-subtle` | `#edf0e9` | Precision-note icon backing |
| `--bg-result` | `#eaf2e4` | Gwei result and mark bars |
| `--bg-hover` | `#dce9d4` | Enabled button hover |
| `--text-primary` | `#202e26` | Headings, body, numbers |
| `--text-secondary` | `#606c63` | Hints, formulas, secondary copy |
| `--border-subtle` | `#dfe4dc` | Grouping and secondary control boundaries |
| `--border-control` | `#737f75` | Input and unit-tag boundaries |
| `--accent-solid` | `#173d32` | Mark and selected text background |
| `--accent-text` | `#315c42` | Decorative wordmark/title punctuation |
| `--focus-ring` | `#315c42` | Keyboard indicator |
| `--text-error` | `#a12c29` | Error text and input error border |

Measured rendered pairs: primary/page 13.19:1, secondary/page 5.11:1, primary/gwei surface 12.38:1, secondary/gwei surface 4.79:1, input border/white 4.18:1, focus/white 7.66:1, and focus/gwei surface 6.69:1. These measurements concern the named solid pairs, not a claim about every possible host environment. Forced colors retain browser color adjustment and use the system `Highlight` outline. Errors always include instructional text; color alone never carries them.

## Typography

- UI stack: `Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. This is a local/system stack; Inter is not bundled or guaranteed. No font file loads. Platform-selected fonts are expected to differ.
- Numeric stack: `"SFMono-Regular", Consolas, "Liberation Mono", monospace`, with `tabular-nums`. Formulas, steps, results, and the input use this stack.
- Actual requested weights: 400 for ordinary copy/numbers, 600 for headings/labels, 650 for the wordmark. `font-synthesis: none` prevents fake styles. A non-variable system face may map these requests to its available faces; cross-platform glyph/weight identity is not verified.
- Type tokens: `--text-xs` 12px, `--text-sm` 13px, `--text-label` 14px, `--text-body` 16px, and `--text-heading` 18px at the default root size. Small metadata/formulas use 11px explicitly.
- H1: `clamp(2.3rem, 5vw, 3.5rem)`, line-height 1.1, letter-spacing −0.055em. Section headings: 18px/1.4; result headings and reference heading: 14px.
- Ordinary descriptions use 1.6 line-height. Compact precision text uses 1.7. Hints/formulas use 1.6. Headings balance; short paragraphs use `text-wrap: pretty`.
- Results: `clamp(1.625rem, 3vw, 2.25rem)` with line-height 1.4 and −0.05em tracking. Values longer than 14 characters use 22px/−0.025em. At the mobile breakpoint these become 30px and 18px, respectively. Long values wrap anywhere without truncation.
- Input is 18px, becoming 16px below 400px. It remains a native horizontally scrollable input for long values. Result text remains fully selectable and copyable.

## Layout

Spacing tokens follow 4, 8, 12, 16, 24, 32, and 48px (`--space-1` through `--space-12`). Controls have at least 44px block size. Example buttons wrap with 12px gaps, reduced to 8px below 400px.

`.page-shell` is centered with a maximum outer width of 1088px and 32px inline padding. The main calculator uses two equal columns, an 8px inset, and consistent label/result edges. `.input-panel` starts at 32px padding; `.results-panel` starts at 24px. The reference section groups its description and three equivalences in one row.

| Breakpoint | Implemented behavior |
| --- | --- |
| Above 60rem | Full panel padding; reference description and units share a row |
| At/below 60rem (960px at default size) | Input padding 24px, result padding 16px; reference description sits above the units |
| At/below 45rem (720px) | One calculator column, 16px page margins, results follow the input, footer stacks, header tagline hides, reference units wrap |
| At/below 25rem (400px) | Intro gets an intentional line break, input font becomes 16px, examples use tighter gaps |

There are no fixed-height text containers, sticky bars, dialogs, or overlays. Values use `min-inline-size: 0` and `overflow-wrap: anywhere`. Layout order equals DOM order. `body` has a 280px minimum; supported/tested reflow begins at 320px. The default result, long values, and invalid/empty states were rendered at representative widths. Final screenshots confirm the layout at 320, 360, 720, 800, and 1200px, plus 200% root-text enlargement at 360px. Native browser zoom and physical phones were not tested.

## Elevation & Depth

The system is mostly flat. A 1px structural border separates the calculator from the page, and a faint `0 4px 20px #202e2605` shadow gives it slight depth. Result surfaces use tone rather than shadows. Reference and header/footer separators use `--border-subtle`. No gradients or decorative background images are used.

## Shapes

`--radius-control` is 10px, `--radius-card` is 16px. The outer calculator is 24px, reduced to 20px on mobile; the desktop 24px outer radius corresponds to its 16px inner card radius plus 8px inset. Unit tags have 4px radii, and the reference/precision icons are circular. All icons use `currentColor` and 1.5px SVG strokes. The three-bar mark is original CSS with a matching local SVG favicon.

## Components

All component patterns live in `web/src/main.tsx` with named classes in `web/src/styles.css`.

| Pattern | API / role | States and behavior |
| --- | --- | --- |
| `App` | Page composition and input state | Starts with an example; conversion updates synchronously; debounced 450ms polite result announcement |
| Wei field | Native text input, numeric input mode, real label | Blank, valid, invalid; linked inline error; paste preserved; no maxlength truncation |
| Examples | Three native buttons inside `.example-buttons` | Populate wei and return focus to the field; button names are contextual amounts under “Try an example” |
| Clear | `.clear-button` | Clears input/results and focuses the field; underlined action label |
| `Result` | `unit`, `value`, `divisor`, optional `tinted` | Named output section; exact decimal; disabled Copy when unavailable; persistent copy feedback; selection fallback on denial |
| `Icon` | `kind`: copy, arrow, check, lock | Decorative SVG; copy becomes a check after success; accessible labels remain on native buttons |
| Reference | `.reference`, `.unit-reference` | Static equivalence list; compact, subordinate to the task |

Focus is a 2px solid semantic ring with a 3px offset. Enabled hover backgrounds apply only when hover is available. Under `prefers-reduced-motion: no-preference`, button background and transform transition for 120ms using `cubic-bezier(.2, 0, 0, 1)`; pressing scales to 0.96. Reduced motion removes these transitions and transforms. Loading states are not needed for synchronous conversion. Copy success remains visible until the value changes; copy errors remain until another action or value change.

## Do's and Don'ts

- Reuse semantic colors, `.page-shell`, spacing tokens, native controls, and the existing result pattern for related tools. Start another tool with one H1, input before results, and a short supporting reference only if needed.
- Preserve exact decimal strings and fully accessible results. Never coerce wei amounts through JavaScript `Number`, round them, or hide precision behind ellipses.
- Keep important text and actions in normal flow, with 44px targets and visible focus.
- Keep the light-theme/system-font design self-contained. Adding an external font, tracker, wallet flow, or gas-price feed would change this product's scope.
- Recheck realistic long values at the responsive breakpoints after changing padding or numeric type sizes. A readable one-wei ETH amount must fit on one line at 320px under the default font size.

Review evidence and remaining limitations are in `artifacts/validation.md`. Source and license attribution for the pinned design/documentation methods is recorded in `README.md` and `web/DESIGN-GUIDANCE-LICENSE.txt`.
