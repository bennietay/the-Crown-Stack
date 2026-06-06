import "dotenv/config";
import cors from "cors";
import express from "express";
import { adminRouter } from "./routes/admin.js";
import { accessRouter } from "./routes/access.js";
import { aiRouter } from "./routes/ai.js";
import { billingRouter, stripeWebhookHandler } from "./routes/billing.js";
import { cmsRouter } from "./routes/cms.js";
import { configRouter } from "./routes/config.js";
import { customersRouter } from "./routes/customers.js";
import { duplicationRouter } from "./routes/duplication.js";
import { notificationsRouter } from "./routes/notifications.js";
import { publicAuthRouter } from "./routes/publicAuth.js";
import { publicLeadsRouter } from "./routes/publicLeads.js";
import { scriptsRouter } from "./routes/scripts.js";
import { rateLimit } from "./middleware/rateLimit.js";

export const app = express();
const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : process.env.NODE_ENV === "production"
    ? false
    : true;

app.disable("x-powered-by");
app.use(cors({ origin: corsOrigin }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "duplios-api" });
});

app.use("/api", configRouter);
app.use(
  "/api/public/checkout",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many checkout attempts. Try again shortly." })
);
app.use(
  "/api/public/register",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many registration attempts. Try again shortly." })
);
app.use(
  "/api/public/leads/capture",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: "Too many lead captures. Try again shortly." })
);
app.use(
  "/api/ai/generate-script",
  rateLimit({ windowMs: 60 * 1000, max: 20, message: "Too many AI requests. Try again shortly." })
);
app.use("/api", publicAuthRouter);
app.use("/api", publicLeadsRouter);
app.use("/api", cmsRouter);
app.use("/api", billingRouter);
app.use("/api", customersRouter);
app.use("/api", notificationsRouter);
app.use("/api", scriptsRouter);
app.use("/api", duplicationRouter);
app.use("/api", accessRouter);
app.use("/api", adminRouter);
app.use("/api", aiRouter);

if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`Duplios API listening on http://localhost:${port}`);
  });
}
