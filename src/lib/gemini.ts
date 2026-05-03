// Direct Gemini API client for frontend
// Calls Google's generativelanguage API directly from the browser
// This avoids the need for Supabase Edge Functions

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// API key stored in env (VITE_ prefix for frontend access)
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiMessage = {
  role: "user" | "model";
  parts: ContentPart[];
};

function dataUrlToInlinePart(dataUrl: string): ContentPart {
  const commaIdx = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, commaIdx);
  const base64Data = dataUrl.slice(commaIdx + 1);
  const mimeType = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  return { inlineData: { mimeType, data: base64Data } };
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

export async function callGemini(
  model: string,
  messages: ChatMessage[],
  options?: { jsonMode?: boolean }
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  let systemText = "";
  const contents: GeminiMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemText = typeof msg.content === "string" ? msg.content : "";
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
        } else if (part.type === "image_url" && part.image_url?.url?.startsWith("data:")) {
          parts.push(dataUrlToInlinePart(part.image_url.url));
        }
      }
    }

    if (parts.length > 0) contents.push({ role, parts });
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      ...(options?.jsonMode && { responseMimeType: "application/json" }),
    },
  };

  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    if (response.status === 429) throw new Error("Limite de requisições atingido. Aguarde alguns minutos.");
    if (response.status === 403) throw new Error("API key inválida. Configure VITE_GEMINI_API_KEY no .env");
    throw new Error(`Erro na API: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Resposta vazia do Gemini.");
  return text;
}
