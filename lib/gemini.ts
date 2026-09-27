type GeminiPart = { text?: string };
type GeminiContent = { role?: string; parts?: GeminiPart[] };
type GeminiResponse = {
  candidates?: { content?: GeminiContent }[];
  error?: { message?: string };
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
}

function modelName() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function geminiConfigured() {
  return Boolean(apiKey());
}

export async function geminiGenerate(options: {
  system?: string;
  contents: { role: 'user' | 'model'; text: string }[];
  json?: boolean;
}) {
  const key = apiKey();
  if (!key) throw new Error('The companion is unavailable right now. Try again later.');

  const response = await fetch(
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
    },
  );

  const data = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new Error('The companion could not reply just now.');
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error('The companion returned an empty reply.');
  return text;
}

export function parseGeminiJson<T>(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
