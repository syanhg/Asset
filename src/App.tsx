import { useEffect, useRef, useState } from 'react';
import {
  BACKGROUNDS,
  BACKGROUND_COLORS,
  CATEGORIES,
  PALETTES,
  PROVIDERS,
  RESOLUTIONS,
  RESOLUTION_DIMENSIONS,
  STYLES,
  type Background,
  type Category,
  type GenerationResult,
  type Palette,
  type Provider,
  type Resolution,
  type Style,
} from './types';
import { Section } from './components/Section';
import { ToggleGroup } from './components/ToggleGroup';
import { ApiKeyPanel } from './components/ApiKeyPanel';
import { CodeEditor } from './components/CodeEditor';
import { VisualizationCanvas, type GenerationStatus } from './components/VisualizationCanvas';
import { ActionButton } from './components/ActionBar';
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
  const [resolution, setResolution] = useState<Resolution>('Preview');

  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);

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
      let userPrompt = buildUserPrompt({ prompt, category, palette, style, background, resolution });
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
      const dim = RESOLUTION_DIMENSIONS[resolution];
      const bg = BACKGROUND_COLORS[background];
      const img = await runRCode(generated.rCode, { width: dim, height: dim, bg });
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

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(result?.title ?? 'visualization')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  const busy = status === 'thinking' || status === 'rendering';

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <header className="pb-8">
          <h1 className="text-[15px] font-medium tracking-[-0.01em]">Mathematical Visualizer</h1>
        </header>

        <Section label="Model Provider">
          <ApiKeyPanel
            provider={providerTyped}
            onProvider={setProvider}
            apiKey={apiKey}
            onApiKey={setApiKey}
            model={model}
            onModel={setModel}
          />
        </Section>

        <Section label="Prompt">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) handleGenerate(false);
            }}
            placeholder="a flowing nebula made from chaotic particles"
            className="w-full h-[38px] px-3 border border-black bg-white text-[13px] placeholder:text-black/40"
          />
        </Section>

        <Section label="Categories">
          <ToggleGroup options={CATEGORIES} value={category} onChange={setCategory} />
        </Section>

        <Section label="Palette">
          <ToggleGroup options={PALETTES} value={palette} onChange={setPalette} />
        </Section>

        <Section label="Style">
          <ToggleGroup options={STYLES} value={style} onChange={setStyle} />
        </Section>

        <Section label="Background">
          <ToggleGroup options={BACKGROUNDS} value={background} onChange={setBackground} />
        </Section>

        <Section label="Resolution">
          <ToggleGroup options={RESOLUTIONS} value={resolution} onChange={setResolution} />
        </Section>

        <div className="border-t border-black py-8 flex flex-col items-end gap-2">
          <ActionButton onClick={() => handleGenerate(false)} disabled={busy}>
            {status === 'thinking' ? 'Querying model…' : status === 'rendering' ? 'Executing R…' : 'Generate'}
          </ActionButton>
        </div>

        <Section label="Generated Visualization">
          {result && (
            <div className="mb-6">
              <div className="text-[13px] font-medium">{result.title}</div>
              <div className="text-[12px] text-black/60 mt-1">{result.description}</div>
            </div>
          )}
          <VisualizationCanvas
            ref={canvasRef}
            bitmap={bitmap}
            status={status}
            errorMessage={status === 'error' ? errorMessage : null}
            background={background}
          />
        </Section>

        <Section label="Generated R Code">
          <CodeEditor code={result?.rCode ?? ''} />
        </Section>

        <div className="border-t border-black py-8 flex flex-wrap gap-3">
          <ActionButton onClick={handleCopy} disabled={!result}>
            Copy
          </ActionButton>
          <ActionButton onClick={handleDownload} disabled={!bitmap}>
            Download PNG
          </ActionButton>
          <ActionButton onClick={() => handleGenerate(true)} disabled={!result || busy}>
            Remix
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
