# Mathematical Visualizer

A single-page, no-backend app that turns a natural-language prompt into computational art: an LLM writes an R script, and that script is executed for real, in the browser, via [webR](https://docs.r-wasm.org/webr/latest/) (R compiled to WebAssembly). 

The UI is a Windows 98-styled desktop app.


## How it works

1. You pick a provider and paste your own API key, plus a prompt and a few design controls.
2. The app sends your prompt + a hardcoded system prompt + those controls directly to the provider's API from your browser, requesting a structured JSON response: `{ title, description, rCode }`.
3. The returned R source is shown read-only in a Monaco editor, then executed locally by webR. The resulting plot is captured as an `ImageBitmap` and drawn to a `<canvas>`.
4. You can copy the R code, save it as a `.R` file, download the rendered PNG, or "Remix" to get a different variation of the same prompt.

Your API key is stored only in `localStorage` and is sent directly to the provider's API (OpenAI / Anthropic / Google).
