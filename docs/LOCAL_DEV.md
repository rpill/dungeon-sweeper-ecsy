# Local Development

## Requirements

- Node.js 20+ (with `npm` in PATH)

## Start the game locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start Vite dev server:
   ```bash
   npm run dev-nolog
   ```
3. Open the URL printed by Vite (usually `http://localhost:5173`).

## SDK behavior in development

- The game tries to load remote Yandex Games SDK from:
  `https://sdk.games.s3.yandex.net/sdk.js`
- If the script or SDK init fails, the game automatically switches to a local mock SDK.
- This means the game still starts and gameplay is testable without Yandex container.

## Generation dev report

When running in Vite dev mode, the following helpers are available in browser console:

- Run full report:
  ```js
  window.__dev.runGenerationReport({ iterations: 200 })
  ```
- Run one generation check:
  ```js
  window.__dev.checkGenerationOnce()
  ```

The report includes generation timing (`min/avg/max`) and hard invariant checks.

## Optional bitmap font generator

`@rtpa/phaser-bitmapfont-generator` is intentionally excluded from default dependencies to keep local setup simple and avoid native `canvas` build issues.

If you need to regenerate bitmap fonts (`bitmap.js`), install it temporarily in a dedicated environment with compatible Node/toolchain, then remove it again.
