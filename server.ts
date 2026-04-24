import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import OpenAI from "openai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Use the OpenRouter API key provided by the user.
  // We keep this server-side so it's not exposed to the frontend.
  const OPENROUTER_API_KEY = "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";

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000", // Required by OpenRouter
      "X-Title": "Neo Coder AI", // Required by OpenRouter
    }
  });

  // API Route for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model = "minimax/minimax-m2.5:free", isThinking } = req.body;

      if (!messages) {
        return res.status(400).json({ error: "Messages are required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: model,
        messages,
        stream: true,
        include_reasoning: !!isThinking
      } as any) as any;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || "";
        
        if (content || reasoning) {
          res.write(`data: ${JSON.stringify({ content, reasoning })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("OpenRouter API Error:", error.response?.data || error.message);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
