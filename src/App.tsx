import { useEffect, useRef, useState } from 'react';
import {
  BACKGROUNDS,
  BACKGROUND_COLORS,
  CATEGORIES,
  OUTPUT_DIMENSION,
  PALETTES,
  PROVIDERS,
  STYLES,
  type Background,
  type Category,
  type GenerationResult,
  type Palette,
  type Provider,
  type Style,
} from './types';
import { TitleBar } from './components/TitleBar';
import { MenuBar } from './components/MenuBar';
import { StatusBar } from './components/StatusBar';
import { GroupBox } from './components/Section';
import { ToggleGroup } from './components/ToggleGroup';
import { ApiKeyPanel } from './components/ApiKeyPanel';
import { CodeEditor } from './components/CodeEditor';
import { VisualizationCanvas, type GenerationStatus } from './components/VisualizationCanvas';
import { ActionButton } from './components/ActionBar';
import { Icon } from './components/Icon';
import { buildSystemPrompt, buildUserPrompt } from './lib/systemPrompt';
import { generateVisualization } from './lib/llm';
import { getWebR, runRCode } from './lib/webr';

function useStored(key: string, initial: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? initial);
  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'visualization'
  );
}

function download(filename: string, content: Blob) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [provider, setProviderRaw] = useStored('mv:provider', 'anthropic');
  const providerTyped = provider as Provider;
  const [apiKey, setApiKey] = useStored(`mv:key:${provider}`, '');
  const [model, setModel] = useStored(
    `mv:model:${provider}`,
    PROVIDERS.find((p) => p.id === provider)?.defaultModel ?? '',
  );

  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<Category>('Flow');
  const [palette, setPalette] = useState<Palette>('Viridis');
  const [style, setStyle] = useState<Style>('Scientific');
  const [background, setBackground] = useState<Background>('White');

  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    getWebR().catch(() => {});
  }, []);

  function setProvider(p: Provider) {
    setProviderRaw(p);
    const stored = localStorage.getItem(`mv:key:${p}`);
    setApiKey(stored ?? '');
    const storedModel = localStorage.getItem(`mv:model:${p}`);
    setModel(storedModel ?? PROVIDERS.find((x) => x.id === p)?.defaultModel ?? '');
  }

  async function handleGenerate(remix: boolean) {
    if (!apiKey.trim()) {
      setStatus('error');
      setErrorMessage('Enter an API key for the selected provider before generating.');
      return;
    }
    if (!prompt.trim()) {
      setStatus('error');
      setErrorMessage('Describe the visualization you want in the prompt field.');
      return;
    }

    setErrorMessage(null);
    setStatus('thinking');
    setBitmap(null);

    try {
      const systemPrompt = buildSystemPrompt();
      let userPrompt = buildUserPrompt({ prompt, category, palette, style, background });
      if (remix) {
        userPrompt +=
          '\n\nThis is a remix request: produce a different variation (different parameters, seed, or composition) of the same theme, not the same script.';
      }

      const generated = await generateVisualization({
        provider: providerTyped,
        apiKey,
        model,
        systemPrompt,
        userPrompt,
      });
      setResult(generated);

      setStatus('rendering');
      const bg = BACKGROUND_COLORS[background];
      const img = await runRCode(generated.rCode, { width: OUTPUT_DIMENSION, height: OUTPUT_DIMENSION, bg });
      setBitmap(img);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.rCode);
  }

  function handleDownloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    canvas.toBlob((blob) => {
      if (blob) download(`${slugify(result?.title ?? 'visualization')}.png`, blob);
    }, 'image/png');
  }

  function handleSaveRCode() {
    if (!result) return;
    download(`${slugify(result.title)}.R`, new Blob([result.rCode], { type: 'text/plain' }));
  }

  function handleNew() {
    setPrompt('');
    setResult(null);
    setBitmap(null);
    setStatus('idle');
    setErrorMessage(null);
  }

  function handleClearOutput() {
    setResult(null);
    setBitmap(null);
    setStatus('idle');
    setErrorMessage(null);
  }

  const busy = status === 'thinking' || status === 'rendering';

  const statusText =
    status === 'thinking'
      ? `Querying ${PROVIDERS.find((p) => p.id === provider)?.label}…`
      : status === 'rendering'
        ? 'Executing R in webR…'
        : status === 'error'
          ? (errorMessage ?? 'Error')
          : status === 'done'
            ? 'Ready'
            : 'Ready';

  return (
    <div className="h-screen w-screen flex flex-col win-panel overflow-hidden">
      <TitleBar />
      <MenuBar
        menus={[
          {
            label: 'File',
            items: [
              { label: 'New Prompt', onClick: handleNew },
              { label: 'Save R Code As…', onClick: handleSaveRCode, disabled: !result },
              { separator: true, label: '' },
              { label: 'Exit', onClick: () => window.close() },
            ],
          },
          {
            label: 'Edit',
            items: [
              { label: 'Copy R Code', onClick: handleCopy, disabled: !result },
              { label: 'Clear Output', onClick: handleClearOutput, disabled: !result && !bitmap },
            ],
          },
          {
            label: 'Help',
            items: [{ label: 'About Mathematical Visualizer', onClick: () => setAboutOpen(true) }],
          },
        ]}
      />

      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 overflow-hidden">
        <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2 items-stretch">
          <GroupBox label="Model Provider" icon="provider">
            <ApiKeyPanel
              provider={providerTyped}
              onProvider={setProvider}
              apiKey={apiKey}
              onApiKey={setApiKey}
              model={model}
              onModel={setModel}
            />
          </GroupBox>

          <GroupBox label="Design Controls" icon="category">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              <ToggleGroup label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
              <ToggleGroup label="Palette" options={PALETTES} value={palette} onChange={setPalette} />
              <ToggleGroup label="Style" options={STYLES} value={style} onChange={setStyle} />
              <ToggleGroup label="Background" options={BACKGROUNDS} value={background} onChange={setBackground} />
            </div>
          </GroupBox>
        </div>

        <GroupBox label="Prompt" icon="new" className="shrink-0" bodyClassName="flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) handleGenerate(false);
            }}
            placeholder="a flowing nebula made from chaotic particles"
            className="win-sunken flex-1 h-[24px] px-2 text-[13px]"
          />
          <ActionButton icon="generate" onClick={() => handleGenerate(false)} disabled={busy}>
            {busy ? 'Working…' : 'Generate'}
          </ActionButton>
        </GroupBox>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2">
          <GroupBox
            label="Generated Visualization"
            icon="visualization"
            className="flex-1 min-h-0 flex flex-col basis-1/2"
            bodyClassName="flex-1 min-h-0 flex flex-col"
          >
            {result && (
              <div className="shrink-0 mb-1">
                <div className="text-[12px] font-bold">{result.title}</div>
                <div className="text-[11px] text-black/70">{result.description}</div>
              </div>
            )}
            <VisualizationCanvas
              ref={canvasRef}
              bitmap={bitmap}
              status={status}
              errorMessage={status === 'error' ? errorMessage : null}
              background={background}
            />
          </GroupBox>

          <GroupBox
            label="Generated R Code"
            icon="rcode"
            className="flex-1 min-h-0 flex flex-col basis-1/2"
            bodyClassName="flex-1 min-h-0 flex flex-col gap-2"
          >
            <CodeEditor code={result?.rCode ?? ''} />
            <div className="shrink-0 flex flex-wrap gap-2">
              <ActionButton icon="copy" onClick={handleCopy} disabled={!result}>
                Copy
              </ActionButton>
              <ActionButton icon="download" onClick={handleDownloadPng} disabled={!bitmap}>
                Download PNG
              </ActionButton>
              <ActionButton icon="remix" onClick={() => handleGenerate(true)} disabled={!result || busy}>
                Remix
              </ActionButton>
            </div>
          </GroupBox>
        </div>
      </div>

      <StatusBar
        left={statusText}
        right={
          <a
            href="https://x.com/alexyango"
            target="_blank"
            rel="noopener noreferrer"
            className="win-raised h-[16px] px-2 flex items-center whitespace-nowrap text-[11px] no-underline text-black"
          >
            @alexyango on X
          </a>
        }
      />

      {aboutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setAboutOpen(false)}
        >
          <div className="win-panel w-[320px]" onClick={(e) => e.stopPropagation()}>
            <div
              className="h-[22px] flex items-center justify-between px-2"
              style={{ background: 'linear-gradient(90deg, var(--title-from), var(--title-to))' }}
            >
              <span className="text-white text-[12px] font-bold">About</span>
              <button
                type="button"
                className="win-raised w-[16px] h-[16px] text-[10px] leading-none"
                onClick={() => setAboutOpen(false)}
              >
                &#10005;
              </button>
            </div>
            <div className="p-4 flex gap-3 items-start">
              <Icon name="about" size={32} />
              <div className="text-[12px] leading-snug">
                <p className="font-bold mb-1">Mathematical Visualizer</p>
                <p>
                  Describe a visualization, pick a category, palette and style, and GPT / Claude / Gemini writes an R
                  script that executes locally in your browser via webR.
                </p>
              </div>
            </div>
            <div className="flex justify-end p-2 pt-0">
              <ActionButton onClick={() => setAboutOpen(false)}>OK</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
