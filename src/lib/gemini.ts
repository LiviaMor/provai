// Direct Gemini API client for frontend
// Calls Google's generativelanguage API directly from the browser

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiMessage = {
  role: "user" | "model";
  parts: ContentPart[];
};

/**
 * Comprime uma imagem data URL para no máximo maxSizeKB.
 * Retorna a imagem comprimida como data URL.
 */
async function compressImageForApi(dataUrl: string, maxWidthPx = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Redimensiona se maior que maxWidth
      if (width > maxWidthPx) {
        height = Math.round((height * maxWidthPx) / width);
        width = maxWidthPx;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Converte para JPEG comprimido
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl); // fallback: retorna original
    img.src = dataUrl;
  });
}

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
  if (!apiKey) throw new Error("Chave de API não configurada. Adicione VITE_GEMINI_API_KEY nas variáveis de ambiente do Vercel.");

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
          // Comprimir imagem antes de enviar (evita 400 por payload grande)
          const compressed = await compressImageForApi(part.image_url.url, 1024, 0.75);
          parts.push(dataUrlToInlinePart(compressed));
        }
      }
    }

    if (parts.length > 0) contents.push({ role, parts });
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      ...(options?.jsonMode && { responseMimeType: "application/json" }),
      maxOutputTokens: 8192,
    },
  };

  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  // Modelo: usar gemini-2.0-flash (nome correto na API direta do Google)
  // gemini-2.5-flash não existe na API pública ainda — é "gemini-2.0-flash" ou "gemini-1.5-flash"
  const modelName = model === "gemini-2.5-flash" ? "gemini-2.0-flash" : model;
  const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${apiKey}`;

  console.log(`[provAI] Calling Gemini ${modelName}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);

    if (response.status === 400) {
      // Parse error details
      try {
        const errData = JSON.parse(errText);
        const msg = errData?.error?.message ?? errText;
        if (msg.includes("API_KEY")) throw new Error("Chave de API inválida. Verifique VITE_GEMINI_API_KEY.");
        if (msg.includes("size") || msg.includes("too large")) throw new Error("Imagem muito grande. Tente com uma foto menor.");
        if (msg.includes("model")) throw new Error(`Modelo "${modelName}" não disponível. Verifique sua chave.`);
        throw new Error(`Erro 400: ${msg.slice(0, 200)}`);
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith("Erro 400")) throw e;
        throw new Error(`Erro na API (400): ${errText.slice(0, 200)}`);
      }
    }
    if (response.status === 429) throw new Error("Limite de requisições atingido. Aguarde 1 minuto e tente novamente.");
    if (response.status === 403) throw new Error("Chave de API sem permissão. Verifique se a API Generative Language está habilitada no Google Cloud.");
    throw new Error(`Erro na API Gemini: ${response.status}`);
  }

  const data = await response.json();

  // Check for blocked content
  if (data.candidates?.[0]?.finishReason === "SAFETY") {
    throw new Error("A imagem foi bloqueada por filtros de segurança. Tente outra foto.");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("Gemini empty response:", JSON.stringify(data).slice(0, 500));
    throw new Error("Resposta vazia do Gemini. Tente novamente.");
  }

  return text;
}
