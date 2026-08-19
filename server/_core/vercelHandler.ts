import "dotenv/config";
import { createApp } from "./app";

// Vercel's Node runtime invokes this default export per-request as a
// serverless function — no .listen() here, unlike the local dev entry
// point at server/_core/index.ts.
//
// This file is bundled (all relative imports inlined) into api/index.js
// during the Vercel build — see the buildCommand in vercel.json. It can't
// be deployed as raw TS/JS with extension-less relative imports because
// this project is "type": "module" (strict ESM) and Vercel's Node function
// builder does not bundle/rewrite import paths, so Node's ESM resolver
// fails with ERR_MODULE_NOT_FOUND on any extension-less relative import.
export default createApp();
