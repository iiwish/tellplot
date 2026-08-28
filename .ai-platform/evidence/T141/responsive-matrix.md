# T141 50x4 Responsive Matrix

## Authoritative Run

- Runtime: actual Node `v22.20.0`, matching `.nvmrc`.
- Command: `TELLPLOT_T141_RESPONSIVE_EVIDENCE_DIR=.ai-platform/evidence/T141/responsive-screenshots TELLPLOT_T141_RESPONSIVE_RECEIPT_DIR=.ai-platform/evidence/T141/responsive-receipts mise x node@22.20.0 -- pnpm exec playwright test e2e/comparison-responsive.spec.ts --project=chromium`.
- Result: `4 passed` in `45.3s`; each viewport/locale family completed `idle`, `hover` and `active-drag`, for exactly `12` cells.
- Inputs: `50` deterministic categories, `4` deterministic series and `200` expected visible marks. The CJK and Latin fixtures exercise the confirmed `12`-character and `24`-character label limits without writing labels or business values to evidence.

## Geometry Method

- Screen evidence uses the real G2 Canvas. `paintedPixels` counts nonblank raster pixels; `rasterComponents` counts distinct palette-colored connected components and is intentionally not treated as a semantic mark count because subpixel rasterization can split a mark. The public SVG independently proves exactly `200` interval elements.
- The public SVG is mounted visibly in the page. Every SVG and visible text element calls `SVGGraphicsElement.getBBox()` and also records a global `getBoundingClientRect()`; text intersection comparisons use only the global client coordinate system.
- All `12` cells recorded page overflow `0`, plot/legend/toolbar intersections `0`, required toolbar-text intersections `0`, protected transient UI occlusions `0` and current interaction-target intersections `false`.
- All `12` public SVGs recorded visible non-zero local/client bounds, pairwise visible-text intersections `0`, interval count `200`, automatic value-label count `0`, the one category annotation label, unsafe/external references `0` and transient SVG elements `0`.
- Every viewport/locale family independently proved Outline `50` source-ordered categories, Tooltip `4` source-ordered series, Inspector `4` source-ordered series and a committed category annotation edit. Hover and drag remain screen-only.

## Cells

| Cell | Canvas | Painted pixels | Marks / raster components | Screen state | Drop | SVG local / client | Visible text | Screenshot |
| --- | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| compact-en-US-idle | 600x424 | 83109 | 200 / 203 | none | false | 664.24x424 / 600x424 | 15 | `responsive-screenshots/compact-en-US-idle.png` |
| compact-en-US-hover | 600x424 | 83109 | 200 / 203 | tooltip | false | 664.24x424 / 600x424 | 15 | `responsive-screenshots/compact-en-US-hover.png` |
| compact-en-US-active-drag | 600x424 | 83109 | 200 / 203 | drag-overlay | true | 664.24x424 / 600x424 | 15 | `responsive-screenshots/compact-en-US-active-drag.png` |
| compact-zh-CN-idle | 600x424 | 83487 | 200 / 203 | none | false | 645.53x424 / 600x424 | 15 | `responsive-screenshots/compact-zh-CN-idle.png` |
| compact-zh-CN-hover | 600x424 | 83487 | 200 / 203 | tooltip | false | 645.53x424 / 600x424 | 15 | `responsive-screenshots/compact-zh-CN-hover.png` |
| compact-zh-CN-active-drag | 600x424 | 83487 | 200 / 203 | drag-overlay | true | 645.53x424 / 600x424 | 15 | `responsive-screenshots/compact-zh-CN-active-drag.png` |
| wide-en-US-idle | 912x416 | 132519 | 200 / 204 | none | false | 968.54x416 / 912x416 | 17 | `responsive-screenshots/wide-en-US-idle.png` |
| wide-en-US-hover | 912x416 | 132519 | 200 / 204 | tooltip | false | 968.54x416 / 912x416 | 17 | `responsive-screenshots/wide-en-US-hover.png` |
| wide-en-US-active-drag | 912x416 | 132519 | 200 / 204 | drag-overlay | true | 968.54x416 / 912x416 | 17 | `responsive-screenshots/wide-en-US-active-drag.png` |
| wide-zh-CN-idle | 912x416 | 133856 | 200 / 204 | none | false | 950.91x416 / 912x416 | 18 | `responsive-screenshots/wide-zh-CN-idle.png` |
| wide-zh-CN-hover | 912x416 | 133856 | 200 / 204 | tooltip | false | 950.91x416 / 912x416 | 18 | `responsive-screenshots/wide-zh-CN-hover.png` |
| wide-zh-CN-active-drag | 912x416 | 133856 | 200 / 204 | drag-overlay | true | 950.91x416 / 912x416 | 18 | `responsive-screenshots/wide-zh-CN-active-drag.png` |

The four task-local JSON receipts under `responsive-receipts/` retain the full screen layout rectangles, SVG local/client boxes, counts and accessible-path booleans for independent replay. They contain no category labels, series labels, amounts, `sourceRef` or metadata values.
