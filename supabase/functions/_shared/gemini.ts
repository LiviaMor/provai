// Shared Gemini API client — replaces Lovable gateway with direct Google API
// Requires GEMINI_API_KEY secret configured in Supabase Edge Functions

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export type GeminiModel = "gemini-2.5-flash" | "gemini-2.5-pro" | "gemini-2.0-flash";

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiMessage = {
  role: "user" | "model";
  parts: ContentPart[];
};

type GeminiRequest = {
  contents: GeminiMessage[];
  systemInstruction?: { parts: ContentPart[] };
  generationConfig?: {
    responseMimeType?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
};

/**
 * Converte uma imagem data URL para o formato inline do Gemini.
 */
function dataUrlToInlinePart(dataUrl: string): ContentPart {
  const commaIdx = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, commaIdx);
  const base64Data = dataUrl.slice(commaIdx + 1);
  const mimeType = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  return { inlineData: { mimeType, data: base64Data } };
}

/**
 * Converte mensagens no formato OpenAI (usado pelo código existente) para formato Gemini.
 */
export function convertMessages(
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
  systemPrompt?: string
): { contents: GeminiMessage[]; systemInstruction?: { parts: ContentPart[] } } {
  const contents: GeminiMessage[] = [];
  let systemInstruction: { parts: ContentPart[] } | undefined;

  if (systemPrompt) {
    systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  for (const msg of messages) {
    if (msg.role === "system") {
      // System messages go to systemInstruction
      const text = typeof msg.content === "string" ? msg.content : "";
      if (text) {
        systemInstruction = { parts: [{ text }] };
      }
      continue;
    }

    const role = msg.role === "assistant" ? "model" : "user";
    const parts: ContentPart[] = [];

    if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          const url = part.image_url.url;
          if (url.startsWith("data:")) {
            parts.push(dataUrlToInlinePart(url));
          } else {
            // For HTTP URLs, we'd need to fetch — skip for now
            parts.push({ text: `[Image URL: ${url}]` });
          }
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  return { contents, systemInstruction };
}

/**
 * Chama a API do Gemini diretamente.
 * Retorna o texto da resposta ou throws em caso de erro.
 */
export async function callGemini(
  model: GeminiModel,
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
  options?: {
    jsonMode?: boolean;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  // Extract system prompt from messages or options
  let systemPrompt = options?.systemPrompt;
  const filteredMessages = messages.filter((m) => {
    if (m.role === "system") {
      if (!systemPrompt) systemPrompt = typeof m.content === "string" ? m.content : "";
      return false;
    }
    return true;
  });

  const { contents, systemInstruction } = convertMessages(filteredMessages, systemPrompt);

  const body: GeminiRequest = {
    contents,
    ...(systemInstruction && { systemInstruction }),
    generationConfig: {
      ...(options?.jsonMode && { responseMimeType: "application/json" }),
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.maxTokens && { maxOutputTokens: options.maxTokens }),
    },
  };

  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    throw new GeminiError("Limite de requisições atingido. Tente novamente em alguns minutos.", 429);
  }
  if (response.status === 403) {
    throw new GeminiError("API key inválida ou sem permissão.", 403);
  }
  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    throw new GeminiError(`Erro na API Gemini: ${response.status}`, response.status);
  }

  const data = (await response.json()) as GeminiResponse;

  if (data.error) {
    throw new GeminiError(data.error.message ?? "Erro desconhecido", data.error.code ?? 500);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError("Resposta vazia do Gemini.", 502);
  }

  return text;
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}
