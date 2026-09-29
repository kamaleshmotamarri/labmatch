type GeminiPart = { text?: string };
type GeminiContent = { role?: string; parts?: GeminiPart[] };
type GeminiCandidate = {
  content?: GeminiContent;
  finishReason?: string;
  safetyRatings?: unknown;
};
type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string; code?: number };
};

const DEFAULT_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;

export class GeminiError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status = 502, retryable = false) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.retryable = retryable;
  }
}

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
}

function modelName() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function geminiConfigured() {
  return Boolean(apiKey());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapHttpError(status: number, message?: string): GeminiError {
  if (status === 429) {
    return new GeminiError(
      message || 'The companion is busy right now. Please wait a moment and try again.',
      429,
      true,
    );
  }
  if (status === 401 || status === 403) {
    return new GeminiError(
      'The companion is misconfigured. Try again later.',
      503,
      false,
    );
  }
  if (status >= 500) {
    return new GeminiError(
      message || 'The companion could not reply just now.',
      503,
      true,
    );
  }
  return new GeminiError(message || 'The companion could not reply just now.', 502, false);
}

async function generateOnce(options: {
  system?: string;
  contents: { role: 'user' | 'model'; text: string }[];
  json?: boolean;
}) {
  const key = apiKey();
  if (!key) {
    throw new GeminiError('The companion is unavailable right now. Try again later.', 503);
  }

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName()}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          systemInstruction: options.system ? { parts: [{ text: options.system }] } : undefined,
          contents: options.contents.map((item) => ({
            role: item.role,
            parts: [{ text: item.text }],
          })),
          generationConfig: options.json ? { responseMimeType: 'application/json' } : undefined,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new GeminiError(
      timedOut ? 'The companion took too long to reply. Try again.' : 'The companion could not reply just now.',
      503,
      true,
    );
  }

  const data = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    const detail = data.error?.message;
    console.error('[gemini]', response.status, detail || 'request failed');
    throw mapHttpError(response.status);
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (text) return text;

  const blockReason = data.promptFeedback?.blockReason;
  const finishReason = candidate?.finishReason;
  console.error('[gemini] empty reply', { blockReason, finishReason });

  if (blockReason || finishReason === 'SAFETY') {
    throw new GeminiError(
      'The companion could not answer that safely. Try rephrasing your question.',
      502,
      false,
    );
  }
  throw new GeminiError('The companion returned an empty reply.', 502, true);
}

export async function geminiGenerate(options: {
  system?: string;
  contents: { role: 'user' | 'model'; text: string }[];
  json?: boolean;
}) {
  let lastError: GeminiError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await generateOnce(options);
    } catch (error) {
      const geminiError = error instanceof GeminiError
        ? error
        : new GeminiError('The companion could not reply just now.', 502, true);
      lastError = geminiError;
      if (!geminiError.retryable || attempt === MAX_ATTEMPTS) throw geminiError;
      await sleep(400 * 2 ** (attempt - 1));
    }
  }

  throw lastError || new GeminiError('The companion could not reply just now.', 502);
}

export function parseGeminiJson<T>(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

export function geminiErrorResponse(error: unknown, fallback = 'The companion could not reply just now.') {
  if (error instanceof GeminiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error('[gemini]', error);
  return Response.json({ error: fallback }, { status: 502 });
}
