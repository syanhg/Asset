import { WebR } from 'webr';

let webRPromise: Promise<WebR> | null = null;

export function getWebR(): Promise<WebR> {
  if (!webRPromise) {
    const webR = new WebR();
    webRPromise = webR.init().then(() => webR);
  }
  return webRPromise;
}

export interface RunOptions {
  width: number;
  height: number;
  bg: string;
}

interface CaptureOutputEntry {
  type: string;
  data: unknown;
}

export async function runRCode(code: string, opts: RunOptions): Promise<ImageBitmap> {
  const webR = await getWebR();
  const shelter = await new webR.Shelter();
  try {
    const capture = await shelter.captureR(code, {
      captureGraphics: { width: opts.width, height: opts.height, bg: opts.bg },
      captureConditions: true,
    });

    const output = (capture.output ?? []) as CaptureOutputEntry[];
    const errors = output.filter((o) => o.type === 'error' || o.type === 'stderr');

    if (!capture.images || capture.images.length === 0) {
      const message = errors
        .map((e) => {
          const d = e.data as { message?: string } | string;
          return typeof d === 'string' ? d : d?.message ?? JSON.stringify(d);
        })
        .filter(Boolean)
        .join('\n');
      throw new Error(message || 'The R script ran but did not produce a plot.');
    }

    return capture.images[capture.images.length - 1];
  } finally {
    await shelter.purge();
  }
}
