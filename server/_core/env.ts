export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  // Hardcoded prod domain (not VERCEL_URL - that's a unique per-deployment
  // URL that can sit behind Vercel's Deployment Protection wall).
  appUrl:
    process.env.APP_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://travel-split-kappa.vercel.app"
      : "http://localhost:3000"),
};
