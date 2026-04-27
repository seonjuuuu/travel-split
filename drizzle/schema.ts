import {
  boolean,
  float,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── 여행 프로젝트 테이블 ────────────────────────────────────
export const travelProjects = mysqlTable("travel_projects", {
  id: varchar("id", { length: 36 }).primaryKey(), // nanoid
  userId: int("userId").notNull(), // 소유자 (users.id)
  name: varchar("name", { length: 100 }).notNull(),
  destination: varchar("destination", { length: 100 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }).notNull(),   // YYYY-MM-DD
  myName: varchar("myName", { length: 50 }).notNull().default("나"),
  shareToken: varchar("shareToken", { length: 32 }), // 공유 링크 토큰 (null이면 비활성)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TravelProject = typeof travelProjects.$inferSelect;
export type InsertTravelProject = typeof travelProjects.$inferInsert;

// ── 멤버 테이블 ──────────────────────────────────────────────
export const projectMembers = mysqlTable("project_members", {
  id: varchar("id", { length: 36 }).primaryKey(), // nanoid
  projectId: varchar("projectId", { length: 36 }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  isMe: boolean("isMe").default(false).notNull(),
  color: varchar("color", { length: 20 }).notNull().default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

// ── 지출 테이블 ────────────────────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: varchar("id", { length: 36 }).primaryKey(), // nanoid
  projectId: varchar("projectId", { length: 36 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  amount: float("amount").notNull(),
  category: mysqlEnum("category", ["식비", "교통", "숙박", "관광", "쇼핑", "기타"])
    .notNull()
    .default("기타"),
  payerId: varchar("payerId", { length: 36 }).notNull(), // projectMembers.id
  participantIds: varchar("participantIds", { length: 2000 }).notNull().default("[]"), // JSON array
  date: varchar("date", { length: 10 }).notNull().default(""), // YYYY-MM-DD (사전결제는 빈 문자열)
  isPreTrip: boolean("isPreTrip").default(false).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbExpense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;