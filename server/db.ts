import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  expenses,
  InsertExpense,
  InsertTravelProject,
  profiles,
  projectMembers,
  travelProjects,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(postgres(process.env.DATABASE_URL));
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function roleForEmail(email: string): "user" | "admin" {
  return ENV.ownerEmail && email === ENV.ownerEmail ? "admin" : "user";
}

export async function getProfileById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return rows[0];
}

export async function createProfile(data: {
  id: string;
  email: string;
  name: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(profiles).values({
    id: data.id,
    email: data.email,
    name: data.name,
    role: roleForEmail(data.email),
    lastSignedIn: new Date(),
  });
  return getProfileById(data.id);
}

export async function touchLastSignedIn(userId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(profiles).set({ lastSignedIn: new Date() }).where(eq(profiles.id, userId));
}

// ── 여행 프로젝트 ────────────────────────────────────────────────
export async function getProjectsByUserId(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(travelProjects).where(eq(travelProjects.userId, userId));
}

export async function getProjectById(id: string, userId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(travelProjects)
    .where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function createProject(data: InsertTravelProject) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(travelProjects).values(data);
  return data;
}

export async function updateProject(
  id: string,
  userId: string,
  data: Partial<Pick<InsertTravelProject, "name" | "destination" | "startDate" | "endDate" | "myName">>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(travelProjects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
}

export async function deleteProject(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(expenses).where(eq(expenses.projectId, id));
  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db
    .delete(travelProjects)
    .where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
}

// ── 공유 토큰 ────────────────────────────────────────────────────
export async function setProjectShareToken(id: string, userId: string, token: string | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(travelProjects)
    .set({ shareToken: token, updatedAt: new Date() })
    .where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
}

export async function getProjectByShareToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(travelProjects)
    .where(eq(travelProjects.shareToken, token))
    .limit(1);
  return rows[0];
}

// ── 멤버 ─────────────────────────────────────────────────────────
export async function getMembersByProjectId(projectId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
}

export async function createMember(data: {
  id: string;
  projectId: string;
  name: string;
  isMe: boolean;
  color: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(projectMembers).values(data);
  return data;
}

export async function updateMember(
  id: string,
  data: Partial<{ name: string; color: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projectMembers).set(data).where(eq(projectMembers.id, id));
}

export async function deleteMember(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectMembers).where(eq(projectMembers.id, id));
}

// ── 지출 ─────────────────────────────────────────────────────────
export async function getExpensesByProjectId(projectId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(eq(expenses.projectId, projectId));
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(expenses).values(data);
  return data;
}

export async function updateExpense(
  id: string,
  data: Partial<Omit<InsertExpense, "id" | "projectId" | "createdAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(expenses).set({ ...data, updatedAt: new Date() }).where(eq(expenses.id, id));
}

export async function deleteExpense(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(expenses).where(eq(expenses.id, id));
}
