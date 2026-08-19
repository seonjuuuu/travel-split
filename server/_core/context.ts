import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Profile as User } from "../../drizzle/schema";
import { authenticateRequest } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures, but log the cause
    // so misconfigured env vars (Supabase/DB) are visible in server logs
    // instead of silently rendering as "logged in with no profile".
    console.error("[Auth] authenticateRequest failed:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
