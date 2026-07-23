import "dotenv/config";
import { createApp } from "../server/_core/app";

// Vercel's Node runtime invokes this default export per-request as a
// serverless function — no .listen() here, unlike the local dev entry
// point at server/_core/index.ts.
export default createApp();
