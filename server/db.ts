import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  expenses,
  InsertExpense,
  InsertTravelProject,
  projectMembers,
  travelProjects,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── 여행 프로젝트 ────────────────────────────────────────────────
export async function getProjectsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(travelProjects).where(eq(travelProjects.userId, userId));
}

export async function getProjectById(id: string, userId: number) {
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
  userId: number,
  data: Partial<Pick<InsertTravelProject, "name" | "destination" | "startDate" | "endDate" | "myName">>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(travelProjects)
    .set(data)
    .where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
}

export async function deleteProject(id: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(expenses).where(eq(expenses.projectId, id));
  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db
    .delete(travelProjects)
    .where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
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
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(expenses).where(eq(expenses.id, id));
}
