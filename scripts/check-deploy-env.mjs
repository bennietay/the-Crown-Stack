const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_IGNITE_PRICE_ID",
  "STRIPE_ASCENT_PRICE_ID",
  "STRIPE_EMPIRE_PRICE_ID",
  "APP_URL"
];

const recommended = ["GEMINI_API_KEY", "DEEPSEEK_API_KEY"];
const missing = required.filter((key) => !process.env[key]);
const missingRecommended = recommended.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("Missing required deployment environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

if (missingRecommended.length > 0) {
  console.warn("Missing optional AI environment variables:");
  for (const key of missingRecommended) {
    console.warn(`- ${key}`);
  }
}

console.log("Deployment environment check passed.");
