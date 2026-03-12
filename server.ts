import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier integration with various AI providers
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors());
// Vercel has a strict 4.5MB payload limit for serverless functions.
// Setting this to 4mb ensures we don't hit the hard limit and crash the function.
app.use(express.json({ limit: '4mb' })); 

// API Keys from environment
const keys = {
  gemini: [
    process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[],
  grok: process.env.GROK_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  cohere: process.env.COHERE_API_KEY,
};

const formatGeminiMessages = (messages: any[]) => {
  const formattedMessages: any[] = [];
  for (const m of messages) {
    const role = m.role === 'user' ? 'user' : 'model';
    
    const parts: any[] = [];
    if (m.content) {
      parts.push({ text: m.content });
    }
    
    if (m.fileData && m.fileData.startsWith('data:')) {
      const match = m.fileData.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    if (formattedMessages.length === 0 && role === 'model') {
      formattedMessages.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }
    
    if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === role) {
      formattedMessages[formattedMessages.length - 1].parts.push(...parts);
    } else {
      formattedMessages.push({ role, parts });
    }
  }
  
  if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === 'model') {
    formattedMessages.push({ role: 'user', parts: [{ text: 'Continue' }] });
  }
  return formattedMessages;
};

// Helper function to call Gemini with retry logic
const callGemini = async (apiKey: string, messages: any[], systemInstruction?: string, model?: string, retries = 2) => {
  const ai = new GoogleGenAI({ apiKey });
  
  const formattedMessages = formatGeminiMessages(messages);

  let currentModel = model || "gemini-2.5-flash";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: formattedMessages,
        config: {
          systemInstruction: systemInstruction ? systemInstruction : undefined,
          tools: [{ googleSearch: {} }]
        }
      });
      let text = response.text;
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        text += '\n\n**Sources:**\n';
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            text += `- [${chunk.web.title}](${chunk.web.uri})\n`;
          }
        });
      }
      return text;
    } catch (error: any) {
      const isRateLimitOrOverloaded = error.message?.includes('503') || error.message?.includes('429');
      
      if (error.message?.includes('429') && currentModel === 'gemini-3.1-pro-preview') {
        console.warn(`Gemini 3.1 Pro quota exceeded. Falling back to Gemini 2.5 Flash...`);
        currentModel = 'gemini-2.5-flash';
        continue;
      }

      if (isRateLimitOrOverloaded && attempt < retries) {
        console.warn(`Gemini API overloaded/rate-limited (Attempt ${attempt + 1}/${retries + 1}). Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }
};

// Helper function to call OpenAI compatible endpoints (OpenAI, Grok, OpenRouter)
const callOpenAICompatible = async (url: string, apiKey: string, model: string, messages: any[], systemInstruction?: string) => {
  const formattedMessages = [];
  if (systemInstruction) {
    formattedMessages.push({ role: "system", content: systemInstruction });
  }
  formattedMessages.push(...messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  })));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: formattedMessages,
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

// Helper for Anthropic
const callAnthropic = async (apiKey: string, messages: any[], systemInstruction?: string) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: systemInstruction,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
};

// Helper for Cohere
const callCohere = async (apiKey: string, messages: any[], systemInstruction?: string) => {
  const chatHistory = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'USER' : 'CHATBOT',
    message: m.content
  }));
  const lastMessage = messages[messages.length - 1].content;

  const response = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "command-r",
      message: lastMessage,
      chat_history: chatHistory,
      preamble: systemInstruction
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.text;
};

app.post("/api/chat", async (req, res) => {
  const { messages, systemInstruction, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const errors: string[] = [];

  // 1. Try Gemini Keys
  for (let i = 0; i < keys.gemini.length; i++) {
    try {
      const text = await callGemini(keys.gemini[i], messages, systemInstruction, model);
      return res.json({ text, provider: `Gemini (Key ${i + 1})` });
    } catch (err: any) {
      console.error(`Gemini Key ${i + 1} failed:`, err.message);
      errors.push(`Gemini Key ${i + 1}: ${err.message}`);
    }
  }

  // 2. Try Grok
  if (keys.grok) {
    try {
      const text = await callOpenAICompatible("https://api.x.ai/v1/chat/completions", keys.grok, "grok-beta", messages, systemInstruction);
      return res.json({ text, provider: "Grok" });
    } catch (err: any) {
      console.error("Grok failed:", err.message);
      errors.push(`Grok: ${err.message}`);
    }
  }

  // 3. Try OpenAI
  if (keys.openai) {
    try {
      const text = await callOpenAICompatible("https://api.openai.com/v1/chat/completions", keys.openai, "gpt-3.5-turbo", messages, systemInstruction);
      return res.json({ text, provider: "OpenAI" });
    } catch (err: any) {
      console.error("OpenAI failed:", err.message);
      errors.push(`OpenAI: ${err.message}`);
    }
  }

  // 4. Try Anthropic
  if (keys.anthropic) {
    try {
      const text = await callAnthropic(keys.anthropic, messages, systemInstruction);
      return res.json({ text, provider: "Anthropic" });
    } catch (err: any) {
      console.error("Anthropic failed:", err.message);
      errors.push(`Anthropic: ${err.message}`);
    }
  }

  // 5. Try OpenRouter
  if (keys.openrouter) {
    try {
      const text = await callOpenAICompatible("https://openrouter.ai/api/v1/chat/completions", keys.openrouter, "openrouter/auto", messages, systemInstruction);
      return res.json({ text, provider: "OpenRouter" });
    } catch (err: any) {
      console.error("OpenRouter failed:", err.message);
      errors.push(`OpenRouter: ${err.message}`);
    }
  }

  // 6. Try Cohere
  if (keys.cohere) {
    try {
      const text = await callCohere(keys.cohere, messages, systemInstruction);
      return res.json({ text, provider: "Cohere" });
    } catch (err: any) {
      console.error("Cohere failed:", err.message);
      errors.push(`Cohere: ${err.message}`);
    }
  }

  // If all fail
  res.status(200).json({ 
    error: "All AI providers failed or no keys available.", 
    details: errors 
  });
});

app.post("/api/chat/stream", async (req, res) => {
  const { messages, systemInstruction, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const errors: string[] = [];
  let currentModel = model || "gemini-2.5-flash";

  // 1. Try Gemini Keys (Streaming)
  for (let i = 0; i < keys.gemini.length; i++) {
    let attempt = 0;
    let success = false;
    
    while (attempt < 2 && !success) {
      try {
        const ai = new GoogleGenAI({ apiKey: keys.gemini[i] });
        
        const formattedMessages = formatGeminiMessages(messages);

        const responseStream = await ai.models.generateContentStream({
          model: currentModel,
          contents: formattedMessages,
          config: {
            systemInstruction: systemInstruction ? systemInstruction : undefined,
            tools: [{ googleSearch: {} }]
          }
        });

        let sourcesStr = '';
        for await (const chunk of responseStream) {
          const c = chunk as any;
          if (c.text) {
            const providerStr = `Gemini (Key ${i + 1})`;
            res.write(`data: ${JSON.stringify({ text: c.text, provider: providerStr })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          }
          const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks && chunks.length > 0 && !sourcesStr) {
             sourcesStr = '\n\n**Sources:**\n';
             chunks.forEach((chunk: any) => {
               if (chunk.web?.uri && chunk.web?.title) {
                 sourcesStr += `- [${chunk.web.title}](${chunk.web.uri})\n`;
               }
             });
          }
        }
        if (sourcesStr) {
           res.write(`data: ${JSON.stringify({ text: sourcesStr, provider: `Gemini (Key ${i + 1})` })}\n\n`);
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
        success = true;
        return;
      } catch (err: any) {
        if (err.message?.includes('429') && currentModel === 'gemini-3.1-pro-preview') {
          console.warn(`Gemini 3.1 Pro quota exceeded on Key ${i + 1}. Falling back to Gemini 2.5 Flash...`);
          currentModel = 'gemini-2.5-flash';
          attempt++;
          continue;
        }
        
        console.error(`Gemini Key ${i + 1} stream failed:`, err.message);
        errors.push(`Gemini Key ${i + 1}: ${err.message}`);
        break; // Break the while loop and try the next key
      }
    }
    if (success) return;
  }

  // Fallbacks (Non-streaming, just send as one chunk)
  // 2. Try Grok
  if (keys.grok) {
    try {
      const text = await callOpenAICompatible("https://api.x.ai/v1/chat/completions", keys.grok, "grok-beta", messages, systemInstruction);
      res.write(`data: ${JSON.stringify({ text, provider: "Grok" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    } catch (err: any) {
      errors.push(`Grok: ${err.message}`);
    }
  }

  // 3. Try OpenAI
  if (keys.openai) {
    try {
      const text = await callOpenAICompatible("https://api.openai.com/v1/chat/completions", keys.openai, "gpt-3.5-turbo", messages, systemInstruction);
      res.write(`data: ${JSON.stringify({ text, provider: "OpenAI" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    } catch (err: any) {
      errors.push(`OpenAI: ${err.message}`);
    }
  }

  // 4. Try Anthropic
  if (keys.anthropic) {
    try {
      const text = await callAnthropic(keys.anthropic, messages, systemInstruction);
      res.write(`data: ${JSON.stringify({ text, provider: "Anthropic" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    } catch (err: any) {
      errors.push(`Anthropic: ${err.message}`);
    }
  }

  // 5. Try OpenRouter
  if (keys.openrouter) {
    try {
      const text = await callOpenAICompatible("https://openrouter.ai/api/v1/chat/completions", keys.openrouter, "openrouter/auto", messages, systemInstruction);
      res.write(`data: ${JSON.stringify({ text, provider: "OpenRouter" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    } catch (err: any) {
      errors.push(`OpenRouter: ${err.message}`);
    }
  }

  // 6. Try Cohere
  if (keys.cohere) {
    try {
      const text = await callCohere(keys.cohere, messages, systemInstruction);
      res.write(`data: ${JSON.stringify({ text, provider: "Cohere" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    } catch (err: any) {
      errors.push(`Cohere: ${err.message}`);
    }
  }

  res.write(`data: ${JSON.stringify({ error: "All AI providers failed or no keys available.", details: errors })}\n\n`);
  res.write(`data: [DONE]\n\n`);
  res.end();
});

app.post("/api/image", async (req, res, next) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const errors: string[] = [];

  for (let i = 0; i < keys.gemini.length; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: keys.gemini[i] });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt }
          ]
        }
      });

      let imageUrl = '';
      if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        return res.json({ imageUrl, provider: `Tahir GPT` });
      } else {
        errors.push(`Gemini Key ${i + 1}: No image returned in response.`);
      }
    } catch (geminiErr: any) {
      // Only log non-quota errors to avoid spamming the console when we expect quota issues
      if (!geminiErr.message?.includes('429') && !geminiErr.message?.includes('Quota')) {
        console.error(`Gemini Image Key ${i + 1} failed:`, geminiErr.message);
      }
      errors.push(`Gemini Key ${i + 1}: ${geminiErr.message}`);
    }
  }

  // If we reach here, all keys failed. Return a 200 with an error message so the frontend can handle it gracefully instead of a 500 which might cause Vercel to throw a generic error page.
  return res.status(200).json({ 
    error: "Failed to generate image. Please try again later.", 
    details: errors 
  });
});

// Global error handler to prevent HTML responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

export default app;

async function startServer() {
  // API routes FIRST
  // (The routes are already defined above in the file, but we need to ensure they are mounted before static files)

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist in production
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    
    // Catch-all route for SPA
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}
