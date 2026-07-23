import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express, { type Express } from "express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerStorageProxy } from "./storageProxy";

/**
 * Builds the Express app shared by the local dev server (server/_core/index.ts,
 * which adds Vite/static-file serving and calls .listen()) and the Vercel
 * serverless entry (api/index.ts, which exports this directly with no .listen()).
 */
export function createApp(): Express {
  const app = express();
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
