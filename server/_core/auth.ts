import { ForbiddenError } from "@shared/_core/errors";
import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";
import type { Profile } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const supabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey);

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length);
}

export async function authenticateRequest(req: Request): Promise<Profile> {
  const token = getBearerToken(req);
  if (!token) {
    throw ForbiddenError("Missing access token");
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw ForbiddenError("Invalid or expired access token");
  }

  const authUser = data.user;
  let profile = await db.getProfileById(authUser.id);

  if (!profile) {
    if (!authUser.email) {
      throw ForbiddenError("Account has no email");
    }
    profile = await db.createProfile({
      id: authUser.id,
      email: authUser.email,
      name:
        (authUser.user_metadata?.name as string | undefined) ??
        (authUser.user_metadata?.full_name as string | undefined) ??
        null,
    });
  }

  if (!profile) {
    throw ForbiddenError("Failed to load profile");
  }

  return profile;
}
