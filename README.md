# Mathematical Visualizer

A single-page, no-backend app that turns a natural-language prompt into computational art: an LLM writes an R script, and that script is executed for real, in the browser, via [webR](https://docs.r-wasm.org/webr/latest/) (R compiled to WebAssembly). The UI is a Windows 98-styled desktop app.

**Live:** https://syanhg.github.io/Asset/

## How it works

1. You pick a provider (OpenAI / Anthropic / Gemini) and paste your own API key, plus a prompt and a few design controls (category, palette, style, background).
2. The app sends your prompt + a hardcoded system prompt + those controls directly to the provider's API from your browser, requesting a structured JSON response: `{ title, description, rCode }`.
3. The returned R source is shown read-only in a Monaco editor, then executed locally by webR. The resulting plot is captured as an `ImageBitmap` and drawn to a `<canvas>`.
4. You can copy the R code, save it as a `.R` file, download the rendered PNG, or "Remix" to get a different variation of the same prompt.

There is no server component. Your API key is stored only in `localStorage` and is sent directly to the provider's API (OpenAI / Anthropic / Google), never to any server of ours.

## Tech stack

- React + TypeScript, built with Vite
- Tailwind CSS v4 (`@tailwindcss/vite`) for layout, plain CSS for the Windows 98 chrome (`src/index.css`)
- [`@monaco-editor/react`](https://github.com/suren-atoyan/monaco-react) for the read-only R code view
- [`webr`](https://docs.r-wasm.org/webr/latest/) to execute the generated R code in-browser
- Deployed to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL, pick a provider, paste an API key, and generate.

```bash
npm run build    # type-check + production build to dist/
npm run lint     # oxlint
npm run preview  # serve the production build locally
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages via `actions/deploy-pages`. The repo's Pages source must be set to **GitHub Actions** (Settings → Pages → Build and deployment → Source) for this to take effect.

## Project structure

```
src/
  App.tsx                     top-level layout and state
  types.ts                    shared types + design-control option lists
  index.css                   Win98 design tokens (bevels, palette, fonts)
  components/
    TitleBar.tsx               window title bar
    MenuBar.tsx                File / Edit / Help dropdown menus
    StatusBar.tsx              bottom status bar
    GroupBox.tsx               classic "group box" panel with a label
    LabeledSelect.tsx          label + classic combo-box control
    ApiKeyPanel.tsx            provider radio buttons + key/model inputs
    ActionButton.tsx           raised/pressed 3D button
    Icon.tsx                   small helper for public/icons/*.png
    CodeEditor.tsx             read-only Monaco wrapper
    VisualizationCanvas.tsx    canvas + placeholder/error states
  lib/
    systemPrompt.ts            system + user prompt construction
    llm.ts                     OpenAI / Anthropic / Gemini API calls
    webr.ts                    webR init + R execution/capture
public/
  icons/                       Windows 98-style icons used by the UI (PNG, converted from .ico)
```

## Notes & limitations

- The generated R code is restricted to base R (base/stats/grDevices/graphics/utils) since webR only ships those packages by default — no `library(ggplot2)`, etc.
- LLM output occasionally fails to run (a syntax slip, an unsupported function); the R error is shown in the visualization panel — try Remix or tweak the prompt.
- Model IDs are editable per-provider in the UI in case the hardcoded defaults go stale.
