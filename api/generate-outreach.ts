const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_FIELD_LENGTH = 2_000;
const WINDOW_MS = 60_000;
const MAX_AI_REQUESTS_PER_WINDOW = 12;
const aiRequestCounts = new Map<string, { count: number; resetAt: number }>();

function sanitizeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function getValidatedLeadName(name: unknown) {
  return sanitizeText(name);
}

function rateLimitKey(req: any) {
  return req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "anonymous";
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

function extractOutputText(payload: any) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const parts: string[] = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function validateScripts(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("OpenAI response did not match expected script array.");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`OpenAI response option ${index + 1} is invalid.`);
    }

    const option = item as Record<string, unknown>;
    return {
      type: sanitizeText(option.type),
      description: sanitizeText(option.description),
      message: sanitizeText(option.message),
    };
  });
}

async function generateOpenAiOutreachScripts(input: {
  name: unknown;
  interestType: unknown;
  temperature: unknown;
  stage: unknown;
  notes: unknown;
  settings?: { name?: unknown; brand_name?: unknown };
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is missing on the server.");
  }

  const leadName = getValidatedLeadName(input.name);
  if (!leadName) {
    throw new Error("Lead name is required.");
  }

  const aboName = sanitizeText(input.settings?.name, "Independent ABO Partner");
  const brandName = sanitizeText(input.settings?.brand_name, "Amway Malaysia");
  const model = process.env.OPENAI_MODEL || "gpt-5.5";

  const systemInstruction = `You are ProspectFlow AI Copilot, a senior compliance-vetted assistant for Amway Malaysia Business Owners (ABOs).
Your role is to generate personalized, non-spammy, highly-engaging WhatsApp outreach messages.
You MUST strictly adhere to Amway Malaysia Direct Selling Policies and local regulations:
1. Wellness (Nutrilite): Do NOT make any medical, therapeutic, disease treatment, or cure claims. Never claim a product cures or prevents diabetes, high blood pressure, etc. Focus entirely on daily wellness, lifestyle support, nutrient gaps, and general vitality.
2. Beauty (Artistry): Do NOT make clinical or medical cure claims for skin diseases. Focus on skincare routines, barrier health, radiant glow, and clean vegan beauty.
3. Income/Business Opportunity: Do NOT promise or guarantee fixed income amounts or rapid wealth. Frame it as a digital e-commerce affiliate and direct-selling business built on retail sharing, team mentoring, and flexible personal effort.
4. Tone: Respectful, warm, professional, and culturally aligned with Malaysia. Never sound pushy or aggressive.`;

  const prompt = `Generate exactly three custom outreach templates for a lead with this profile:
- Lead Name: ${leadName}
- Lead Main Interest: ${sanitizeText(input.interestType, "General Interest")}
- Lead Temperature: ${sanitizeText(input.temperature, "Warm")}
- Current Funnel Stage: ${sanitizeText(input.stage, "New Prospect")}
- Notes/Context of past interaction: ${sanitizeText(input.notes, "No prior details recorded.")}
- Amway Representative (ABO) Name: ${aboName}
- Representative Team Brand: ${brandName}

Return exactly 3 message templates. Each option should have a distinct strategic objective:
- Option A: "Soft Icebreaker & Warm Up" (friendly check-in, very low pressure)
- Option B: "Problem-Solver Offer" (proposing a compliance-safe Nutrilite, Artistry, or Business recommendation addressing their context)
- Option C: "Webinar/Funnel Invitation" (inviting them to register for an educational webinar or live demonstration)`;

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "outreach_scripts",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              scripts: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    type: { type: "string" },
                    description: { type: "string" },
                    message: { type: "string" },
                  },
                  required: ["type", "description", "message"],
                },
              },
            },
            required: ["scripts"],
          },
        },
      },
      max_output_tokens: 1600,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI request failed.");
  }

  const responseText = extractOutputText(payload);
  const parsed = JSON.parse(responseText || "{}");
  return validateScripts(parsed.scripts);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { name, interestType, temperature, stage, notes, settings } = req.body || {};
    const key = rateLimitKey(req);

    if (isRateLimited(String(key))) {
      return res.status(429).json({ error: "Too many AI requests. Please wait a minute and try again." });
    }

    const leadName = getValidatedLeadName(name);
    if (!leadName) {
      return res.status(400).json({ error: "Lead name is required." });
    }

    const scripts = await generateOpenAiOutreachScripts({ name, interestType, temperature, stage, notes, settings });

    return res.status(200).json({ success: true, scripts });
  } catch (error: any) {
    console.error("Error in /api/generate-outreach:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate outreach scripts via ChatGPT.",
    });
  }
}
