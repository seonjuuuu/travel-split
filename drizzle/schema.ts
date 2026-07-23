import {
  boolean,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const categoryEnum = pgEnum("category", [
  "식비",
  "교통",
  "숙박",
  "관광",
  "쇼핑",
  "기타",
]);

/**
 * App-level profile for a Supabase Auth user.
 * `id` mirrors auth.users.id (FK added in the migration SQL, since Drizzle
 * doesn't model Supabase's own `auth` schema).
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// ── 여행 프로젝트 테이블 ────────────────────────────────────
export const travelProjects = pgTable("travel_projects", {
  id: varchar("id", { length: 36 }).primaryKey(), // nanoid
  userId: uuid("userId").notNull(), // 소유자 (profiles.id)
  name: varchar("name", { length: 100 }).notNull(),
  destination: varchar("destination", { length: 100 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }).notNull(),   // YYYY-MM-DD
  myName: varchar("myName", { length: 50 }).notNull().default("나"),
  shareToken: varchar("shareToken", { length: 32 }), // 공유 링크 토큰 (null이면 비활성)
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type TravelProject = typeof travelProjects.$inferSelect;
export type InsertTravelProject = typeof travelProjects.$inferInsert;

// ── 멤버 테이블 ──────────────────────────────────────────────
export const projectMembers = pgTable("project_members", {
  id: varchar("id", { length: 36 }).primaryKey(), // nanoid
  projectId: varchar("projectId", { length: 36 }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  isMe: boolean("isMe").default(false).notNull(),
  color: varchar("color", { length: 20 }).notNull().default("#6366f1"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

// ── 지출 테이블 ────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: varchar("id", { length: 36 }).primaryKey(), // nanoid
  projectId: varchar("projectId", { length: 36 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  amount: real("amount").notNull(),
  category: categoryEnum("category").notNull().default("기타"),
  payerId: varchar("payerId", { length: 36 }).notNull(), // projectMembers.id
  participantIds: varchar("participantIds", { length: 2000 }).notNull().default("[]"), // JSON array
  date: varchar("date", { length: 10 }).notNull().default(""), // YYYY-MM-DD (사전결제는 빈 문자열)
  isPreTrip: boolean("isPreTrip").default(false).notNull(),
  isSharedCost: boolean("isSharedCost").default(false).notNull(), // 공동경비 - 정산 제외
  note: text("note"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type DbExpense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
