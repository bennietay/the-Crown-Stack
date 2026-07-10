import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { generateOpenAiOutreachScripts, getValidatedLeadName } from "./lib/openaiOutreach";

dotenv.config({ path: ".env.local" });
dotenv.config();

const WINDOW_MS = 60_000;
const MAX_AI_REQUESTS_PER_WINDOW = 12;
const aiRequestCounts = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(req: express.Request) {
  return req.ip || req.socket.remoteAddress || "anonymous";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const bucket = aiRequestCounts.get(key);

  if (!bucket || bucket.resetAt <= now) {
    aiRequestCounts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_AI_REQUESTS_PER_WINDOW;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const HOST = process.env.HOST || "0.0.0.0";

  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.use((_, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // API Route for ChatGPT script generation
  app.post("/api/generate-outreach", async (req, res) => {
    try {
      const { name } = req.body;
      const key = rateLimitKey(req);

      if (isRateLimited(key)) {
        return res.status(429).json({ error: "Too many AI requests. Please wait a minute and try again." });
      }

      const leadName = getValidatedLeadName(name);
      if (!leadName) {
        return res.status(400).json({ error: "Lead name is required." });
      }

      const scripts = await generateOpenAiOutreachScripts(req.body);
      res.json({ success: true, scripts });
    } catch (error: any) {
      console.error("Error in /api/generate-outreach:", error);
      res.status(500).json({
        error: error.message || "Failed to generate outreach scripts via ChatGPT."
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)
    });
  });

  // Vite development middleware vs production static server
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

  app.listen(PORT, HOST, () => {
    console.log(`ProspectFlow MY Full-Stack Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
