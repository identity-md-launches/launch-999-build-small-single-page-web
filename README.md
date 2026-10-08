# Unit desk — gas calculator

A small browser-only module for converting **wei into gwei and ETH**. The finished site is in [`dist/index.html`](dist/index.html); React and TypeScript source, tests, package manifest, and lockfile are in [`web/`](web/).

Enter wei to update both results instantly. Examples, Clear, and individual copy buttons are included. The initial `1000000000` wei is an editable example, not a live gas price.

## Conversion rules

- 1 gwei = 1,000,000,000 wei; 1 ETH = 1,000,000,000,000,000,000 wei.
- Accepts nonnegative whole numbers, including zero, up to 256 digits. Leading zeros count toward this input limit.
- Accepts ordinary comma groups such as `1,000,000,000`, and trims surrounding whitespace. Rejects malformed grouping, fractions, signs, exponential notation, and hexadecimal input.
- Moves the decimal point with strings, so results never use floating-point arithmetic, rounding, or exponential notation. Only insignificant trailing fractional zeros are removed.
- Invalid or empty input clears both results and disables copying. Oversized input is rejected, never silently truncated.
- This is a unit converter. Estimating a transaction fee additionally requires gas used and a price per gas unit.

No wallet, account, backend, storage, analytics, external fonts, or external runtime requests. All calculations happen in memory on the device. Clipboard writes happen only when a copy button is activated.

## Install and rebuild

Use Node.js 22.18 or newer and npm. From the repository root:

```sh
cd web
npm ci
npm run typecheck
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Open the local URL printed by Vite. `build` writes to the repository-root `dist/`, with relative asset URLs (`base: './'`). To make changes, edit `web/src/`, rebuild, and reload the preview. Preview uses the production export and its strict content security policy.

`npm ci` initially needs the package registry. Once npm's cache is populated, `npm ci --offline` can install from that cache; no registry mirror is bundled. Running the installed build, typecheck, and unit tests needs no network. Browser installation for optional browser checks is separate.

During this assignment, installation and builds ran in `/tmp/wei-calculator-final/web` with an exact copy of the source and lockfile, then the export was copied back. This kept dependency folders and caches outside the repository. Do not include `node_modules`, browser binaries, or package caches in a submission. No ignore files were changed.

Rollup is pinned through `overrides` to `4.44.1`: the initially resolved `4.64.2` stalled in tree shaking with this application. The tested pin builds successfully; see the validation record.

## Preview the export without installing dependencies

From the repository root:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:8080/`. Use an HTTP server, not a `file://` URL, because the export uses JavaScript modules.

## Publish and embed

Upload **all contents of `dist/` together**, including `assets/`, `favicon.svg`, and `THIRD_PARTY_NOTICES.txt`, to a static host. The publisher serves this finished export; no server-side rebuild or route rewrites are required. It can be served at a subpath, such as `/tools/gas/`.

```html
<iframe
  src="./tools/gas/"
  title="Wei to gwei and ETH calculator"
  width="100%"
  height="900"
  allow="clipboard-write"
></iframe>
```

Keep iframe scrolling enabled: the mobile layout and large values can be taller than the frame. If using a sandbox, scripts and the same origin must be allowed for the module assets (`sandbox="allow-scripts allow-same-origin"`). Choose hosting isolation appropriate to your embedding page. The module needs no parent-page integration or messaging.

Automatic copy needs a secure context and browser/iframe clipboard permission. If unavailable, the result is selected and a persistent message explains how to copy it manually. Conversion works regardless of clipboard access. Network access is unnecessary after the assets have loaded; this project does not install a service worker or promise offline reloads.

## Checks actually run

On 2026-10-08, Node 22.23.3 and npm 10.9.9:

| Check | Actual result |
| --- | --- |
| Fresh `npm ci --offline --no-audit --no-fund` with populated external npm cache | Passed; 24 packages installed |
| `npm run typecheck` | Passed, exit 0 |
| `npm test` | Passed, 5 tests; includes 512 deterministic large-number round trips against BigInt |
| `npm run build` | Passed, exit 0; 29 modules, 1.30 seconds |
| Production browser interaction script | Passed, 16 check groups in Chromium 154.0.8037.0 |
| Responsive production export | No horizontal page overflow at 320, 360, 720, 800, and 1200 CSS pixels |
| Sandboxed iframe | Conversion checked at 360 and 1200 pixels; blocked clipboard fallback checked |
| Axe 4.10.3 | Zero violations and zero incomplete rules in valid, invalid, and empty states for selected WCAG A/AA tags |

Production JS is approximately 195.52 kB (61.64 kB gzip), CSS 11.58 kB (2.77 kB gzip), and HTML 1.03 kB (0.55 kB gzip), plus the local favicon and notices. See [`artifacts/validation.md`](artifacts/validation.md), [`artifacts/browser-results.json`](artifacts/browser-results.json), and the screenshots for detailed evidence and the six-domain design review. [`DESIGN.md`](DESIGN.md) describes the final implementation.

To reproduce browser checks after building:

```sh
cd web
npx playwright install chromium
npm run test:browser
```

The script serves `dist/` under `/preview/`, launches Chromium, tests the actual export, writes evidence to `artifacts/`, and closes its server and browser in the same foreground process. `BROWSER_EXECUTABLE` can select an installed Chromium executable; `EXPORT_ROOT` and `EVIDENCE_ROOT` can select alternate absolute paths. In this environment the installed Chromium headless shell was selected because the browser connector returned `Transport closed` and full Chromium's crash handler could not launch. The headless shell completed all checks.

Limitations: no physical-device or screen-reader session, no Firefox/WebKit run, and no browser-native 200% zoom test. A separate 200% root-text enlargement test passed. Automated accessibility checks and worker review are not an independent certification. System fonts vary by platform.

## Design guidance and licenses

Applied the pinned Better Interface guide across accessibility, layout, writing, typography, colors, and UI. Design guidance is adapted from Jakub Krehel's Better Interface, MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation guidance is adapted from Paul Bakaus's Impeccable, Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, copyright 2025 Paul Bakaus. The original combined license notice is retained in [`web/DESIGN-GUIDANCE-LICENSE.txt`](web/DESIGN-GUIDANCE-LICENSE.txt). Runtime dependency notices are shipped in `dist/THIRD_PARTY_NOTICES.txt`.
