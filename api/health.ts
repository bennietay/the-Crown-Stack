export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: "ok",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
  });
}
