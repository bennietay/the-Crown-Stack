import { Router } from "express";

export const aiRouter = Router();

type AiProvider = "gemini" | "deepseek" | "openai";

interface GenerateScriptBody {
  provider?: AiProvider;
  model?: string;
  platform?: string;
  tone?: string;
  context?: string;
  baseScript?: string;
}

const fallbackScript = ({
  platform = "Instagram",
  tone = "Professional",
  context = "",
  baseScript = "Want me to send the short overview?"
}: GenerateScriptBody) =>
  `${tone} ${platform} opener:\n\n${context ? `Based on: ${context}\n\n` : ""}${baseScript}\n\nPersonal note: keep it short, permission-based, and easy to reply to.`;

const systemPrompt =
  "You write compliant, low-pressure network marketing outreach scripts. Avoid income guarantees, medical claims, hype, pressure, and false scarcity. Keep messages short, human, permission-based, and easy to reply to.";

aiRouter.post("/ai/generate-script", async (req, res) => {
  const body = req.body as GenerateScriptBody;
  const provider = body.provider ?? "gemini";
  const platform = body.platform ?? "Instagram";
  const tone = body.tone ?? "Professional";
  const context = body.context ?? "";
  const baseScript = body.baseScript ?? "Want me to send the short overview?";
  const userPrompt = [
    `Platform: ${platform}`,
    `Tone: ${tone}`,
    `Prospect context: ${context || "No extra context provided."}`,
    `Leader-approved base script: ${baseScript}`,
    "Return one ready-to-send script and one short follow-up line."
  ].join("\n");

  try {
    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        return res.json({ provider: "local", script: fallbackScript(body), missingKey: "OPENAI_API_KEY" });
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: body.model ?? process.env.OPENAI_MODEL ?? "gpt-5.2",
          instructions: systemPrompt,
          input: userPrompt
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: error || "OpenAI request failed." });
      }

      const data = (await response.json()) as {
        output_text?: string;
        output?: Array<{ content?: Array<{ text?: string }> }>;
      };
      const script =
        data.output_text ??
        data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n").trim();

      return res.json({ provider: "openai", script: script || fallbackScript(body) });
    }

    if (provider === "deepseek") {
      const apiKey = process.env.DEEPSEEK_API_KEY;

      if (!apiKey) {
        return res.json({ provider: "local", script: fallbackScript(body), missingKey: "DEEPSEEK_API_KEY" });
      }

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: body.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: error || "DeepSeek request failed." });
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return res.json({ provider: "deepseek", script: data.choices?.[0]?.message?.content ?? fallbackScript(body) });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({ provider: "local", script: fallbackScript(body), missingKey: "GEMINI_API_KEY" });
    }

    const model = body.model ?? process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: error || "Gemini request failed." });
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const script = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

    return res.json({ provider: "gemini", script: script || fallbackScript(body) });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to generate script."
    });
  }
});
