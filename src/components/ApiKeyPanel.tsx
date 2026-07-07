import { PROVIDERS, type Provider } from '../types';

export function ApiKeyPanel({
  provider,
  onProvider,
  apiKey,
  onApiKey,
  model,
  onModel,
}: {
  provider: Provider;
  onProvider: (p: Provider) => void;
  apiKey: string;
  onApiKey: (v: string) => void;
  model: string;
  onModel: (v: string) => void;
}) {
  const current = PROVIDERS.find((p) => p.id === provider)!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PROVIDERS.map((p) => {
          const active = p.id === provider;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onProvider(p.id)}
              className={
                'h-[34px] px-4 border border-black text-[12px] transition-opacity-fast cursor-pointer ' +
                (active ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white')
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="password"
          spellCheck={false}
          autoComplete="off"
          value={apiKey}
          onChange={(e) => onApiKey(e.target.value)}
          placeholder={`${current.label} API key`}
          className="flex-1 h-[34px] px-3 border border-black bg-white text-[12px] placeholder:text-black/40"
        />
        <input
          type="text"
          spellCheck={false}
          autoComplete="off"
          value={model}
          onChange={(e) => onModel(e.target.value)}
          placeholder="model"
          className="w-full sm:w-[220px] h-[34px] px-3 border border-black bg-white text-[12px] placeholder:text-black/40"
        />
      </div>
      <p className="text-[11px] text-black/50">
        Stored only in this browser (localStorage). Sent directly to the provider's API — never to any server of
        ours.
      </p>
    </div>
  );
}
