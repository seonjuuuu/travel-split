// server/_core/vercelHandler.ts
import "dotenv/config";

// server/_core/app.ts
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { customAlphabet, nanoid } from "nanoid";
import { z as z2 } from "zod";

// server/_core/env.ts
var ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  appUrl: process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
};

// server/_core/mail.ts
var _transporter = null;
async function getTransporter() {
  if (!ENV.gmailUser || !ENV.gmailAppPassword) return null;
  if (_transporter) return _transporter;
  try {
    const { default: nodemailer } = await import("nodemailer");
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: ENV.gmailUser, pass: ENV.gmailAppPassword }
    });
    return _transporter;
  } catch (error) {
    console.warn("[Mail] Failed to load nodemailer:", error);
    return null;
  }
}
async function sendMail(to, subject, html) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn(`[Mail] GMAIL_USER/GMAIL_APP_PASSWORD not configured - skipped: "${subject}" to ${to}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: `\uD2B8\uB9BD\uC2A4\uD50C\uB9BF <${ENV.gmailUser}>`, to, subject, html });
    return true;
  } catch (error) {
    console.warn("[Mail] Failed to send email:", error);
    return false;
  }
}
async function sendTodoAssignedEmail(params) {
  const { to, assigneeName, creatorName, projectId, projectName, todoTitle } = params;
  const projectUrl = `${ENV.appUrl}/project/${projectId}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <p style="color: #5B6B72; font-size: 13px; margin-bottom: 4px;">TRIP \xB7 SPLIT</p>
      <h2 style="color: #12222D; margin: 0 0 16px;">${assigneeName}\uB2D8, \uC0C8 \uD560\uC77C\uC774 \uC0DD\uACBC\uC5B4\uC694</h2>
      <p style="color: #12222D; font-size: 15px; line-height: 1.6;">
        <strong>${creatorName}</strong>\uB2D8\uC774 <strong>${projectName}</strong> \uC5EC\uD589\uC5D0 \uD560\uC77C\uC744 \uB4F1\uB85D\uD558\uBA74\uC11C \uD68C\uC6D0\uB2D8\uC744 \uB2F4\uB2F9\uC790\uB85C \uC9C0\uC815\uD588\uC5B4\uC694.
      </p>
      <div style="background: #F6F7F2; border: 1px solid #12222D1F; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 15px; color: #12222D;">
        ${todoTitle}
      </div>
      <a href="${projectUrl}" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        \uC5EC\uD589 \uD398\uC774\uC9C0\uC5D0\uC11C \uD655\uC778\uD558\uAE30
      </a>
    </div>
  `;
  return sendMail(to, `[${projectName}] \uC0C8 \uD560\uC77C: ${todoTitle}`, html);
}
async function sendMemberJoinedEmail(params) {
  const { to, recipientName, joinedMemberName, projectId, projectName } = params;
  const projectUrl = `${ENV.appUrl}/project/${projectId}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <p style="color: #5B6B72; font-size: 13px; margin-bottom: 4px;">TRIP \xB7 SPLIT</p>
      <h2 style="color: #12222D; margin: 0 0 16px;">${recipientName}\uB2D8, \uC0C8 \uBA64\uBC84\uAC00 \uCC38\uC5EC\uD588\uC5B4\uC694</h2>
      <p style="color: #12222D; font-size: 15px; line-height: 1.6;">
        <strong>${joinedMemberName}</strong>\uB2D8\uC774 <strong>${projectName}</strong> \uC5EC\uD589\uC5D0 \uD569\uB958\uD574\uC11C \uAC19\uC774 \uC9C0\uCD9C\uC744 \uAE30\uB85D\uD560 \uC218 \uC788\uAC8C \uB410\uC5B4\uC694.
      </p>
      <a href="${projectUrl}" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        \uC5EC\uD589 \uD398\uC774\uC9C0\uC5D0\uC11C \uD655\uC778\uD558\uAE30
      </a>
    </div>
  `;
  return sendMail(to, `[${projectName}] ${joinedMemberName}\uB2D8\uC774 \uCC38\uC5EC\uD588\uC5B4\uC694`, html);
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// shared/const.ts
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/db.ts
import { and, eq, exists, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import {
  boolean,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var categoryEnum = pgEnum("category", [
  "\uC2DD\uBE44",
  "\uAD50\uD1B5",
  "\uC219\uBC15",
  "\uAD00\uAD11",
  "\uC1FC\uD551",
  "\uAE30\uD0C0"
]);
var profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull()
});
var travelProjects = pgTable("travel_projects", {
  id: varchar("id", { length: 36 }).primaryKey(),
  // nanoid
  userId: uuid("userId").notNull(),
  // 소유자 (profiles.id)
  name: varchar("name", { length: 100 }).notNull(),
  destination: varchar("destination", { length: 100 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }).notNull(),
  // YYYY-MM-DD
  myName: varchar("myName", { length: 50 }).notNull().default("\uB098"),
  shareToken: varchar("shareToken", { length: 32 }),
  // 읽기 전용 공유 링크 토큰 (null이면 비활성)
  editToken: varchar("editToken", { length: 32 }),
  // 가입해서 공동 편집하는 초대 링크 토큰 (null이면 비활성)
  inviteCode: varchar("inviteCode", { length: 8 }).unique(),
  // editToken과 같이 발급/해제되는 짧은 초대 코드 (null이면 비활성)
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull()
});
var projectMembers = pgTable("project_members", {
  id: varchar("id", { length: 36 }).primaryKey(),
  // nanoid
  projectId: varchar("projectId", { length: 36 }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  isMe: boolean("isMe").default(false).notNull(),
  color: varchar("color", { length: 20 }).notNull().default("#6366f1"),
  /** 이 멤버로 로그인해서 공동 편집할 수 있는 Supabase 계정. null이면 계정 없는 이름표 멤버. */
  profileId: uuid("profileId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var expenses = pgTable("expenses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  // nanoid
  projectId: varchar("projectId", { length: 36 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  amount: real("amount").notNull(),
  category: categoryEnum("category").notNull().default("\uAE30\uD0C0"),
  payerId: varchar("payerId", { length: 36 }).notNull(),
  // projectMembers.id
  participantIds: varchar("participantIds", { length: 2e3 }).notNull().default("[]"),
  // JSON array
  date: varchar("date", { length: 10 }).notNull().default(""),
  // YYYY-MM-DD (사전결제는 빈 문자열)
  isPreTrip: boolean("isPreTrip").default(false).notNull(),
  isSharedCost: boolean("isSharedCost").default(false).notNull(),
  // 공동경비 - 정산 제외
  isPersonal: boolean("isPersonal").default(false).notNull(),
  // 개인경비 - 정산 제외, 결제자 본인 지출로만 기록
  note: text("note"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull()
});
var todos = pgTable("todos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  // nanoid
  projectId: varchar("projectId", { length: 36 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  assigneeIds: varchar("assigneeIds", { length: 2e3 }).notNull().default("[]"),
  // JSON array of projectMembers.id (빈 배열이면 담당자 미지정)
  isDone: boolean("isDone").default(false).notNull(),
  // 담당자 0~1명일 때 사용하는 완료 여부
  doneBy: varchar("doneBy", { length: 2e3 }).notNull().default("[]"),
  // 담당자 2명 이상일 때, 각자 완료한 사람의 projectMembers.id JSON 배열
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
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
function roleForEmail(email) {
  return ENV.ownerEmail && email === ENV.ownerEmail ? "admin" : "user";
}
async function getProfileById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return rows[0];
}
async function createProfile(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(profiles).values({
    id: data.id,
    email: data.email,
    name: data.name,
    role: roleForEmail(data.email),
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  return getProfileById(data.id);
}
async function updateProfileName(id, name) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(profiles).set({ name, updatedAt: /* @__PURE__ */ new Date() }).where(eq(profiles.id, id));
}
async function getProjectsForUser(profileId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(travelProjects).where(
    exists(
      db.select().from(projectMembers).where(
        and(
          eq(projectMembers.projectId, travelProjects.id),
          eq(projectMembers.profileId, profileId)
        )
      )
    )
  );
}
async function getProjectAccess(projectId, profileId) {
  const db = await getDb();
  if (!db) return void 0;
  const memberRows = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.profileId, profileId))).limit(1);
  if (memberRows.length === 0) return void 0;
  const projectRows = await db.select().from(travelProjects).where(eq(travelProjects.id, projectId)).limit(1);
  if (projectRows.length === 0) return void 0;
  return { project: projectRows[0], memberId: memberRows[0].id };
}
async function createProject(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(travelProjects).values(data);
  return data;
}
async function updateProject(id, userId, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(travelProjects).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
}
async function deleteProject(id, userId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(expenses).where(eq(expenses.projectId, id));
  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db.delete(travelProjects).where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
}
async function setProjectShareToken(id, userId, token) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(travelProjects).set({ shareToken: token, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
}
async function setProjectEditToken(id, userId, token, inviteCode) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(travelProjects).set({ editToken: token, inviteCode, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(travelProjects.id, id), eq(travelProjects.userId, userId)));
}
async function isInviteCodeTaken(code) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: travelProjects.id }).from(travelProjects).where(eq(travelProjects.inviteCode, code)).limit(1);
  return rows.length > 0;
}
async function getProjectByEditToken(tokenOrCode) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(travelProjects).where(
    or(
      eq(travelProjects.editToken, tokenOrCode),
      eq(travelProjects.inviteCode, tokenOrCode)
    )
  ).limit(1);
  return rows[0];
}
async function getProjectByShareToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(travelProjects).where(eq(travelProjects.shareToken, token)).limit(1);
  return rows[0];
}
async function getMembersByProjectId(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
}
async function getMemberById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(projectMembers).where(eq(projectMembers.id, id)).limit(1);
  return rows[0];
}
async function createMember(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(projectMembers).values(data);
  return data;
}
async function getUnclaimedMembers(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), isNull(projectMembers.profileId)));
}
async function claimMember(memberId, profileId) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projectMembers).set({ profileId }).where(eq(projectMembers.id, memberId));
}
async function updateMember(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projectMembers).set(data).where(eq(projectMembers.id, id));
}
async function deleteMember(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectMembers).where(eq(projectMembers.id, id));
}
async function getExpensesByProjectId(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(eq(expenses.projectId, projectId));
}
async function getExpenseById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return rows[0];
}
async function createExpense(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(expenses).values(data);
  return data;
}
async function updateExpense(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(expenses).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(expenses.id, id));
}
async function deleteExpense(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(expenses).where(eq(expenses.id, id));
}
async function getTodosByProjectId(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(todos).where(eq(todos.projectId, projectId));
}
async function getTodoById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(todos).where(eq(todos.id, id)).limit(1);
  return rows[0];
}
async function createTodo(data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(todos).values(data);
  return data;
}
async function updateTodo(id, data) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(todos).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(todos.id, id));
}
async function deleteTodo(id) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(todos).where(eq(todos.id, id));
}

// server/routers.ts
var CategoryEnum = z2.enum(["\uC2DD\uBE44", "\uAD50\uD1B5", "\uC219\uBC15", "\uAD00\uAD11", "\uC1FC\uD551", "\uAE30\uD0C0"]);
var MEMBER_COLORS = [
  "#6366f1",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f43f5e"
];
function pickNextColor(usedColors) {
  const available = MEMBER_COLORS.filter((c) => !usedColors.includes(c));
  return available.length > 0 ? available[0] : MEMBER_COLORS[usedColors.length % MEMBER_COLORS.length];
}
var generateInviteCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);
async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    if (!await isInviteCodeTaken(code)) return code;
  }
  throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\uCD08\uB300 \uCF54\uB4DC \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694" });
}
async function assertProjectAccess(projectId, userId) {
  const access = await getProjectAccess(projectId, userId);
  if (!access) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "\uC774 \uD504\uB85C\uC81D\uD2B8\uC5D0 \uC811\uADFC\uD560 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
  }
  return access;
}
function mapExpenseRow(e) {
  return {
    ...e,
    participantIds: JSON.parse(e.participantIds || "[]"),
    isPreTrip: Boolean(e.isPreTrip),
    isSharedCost: Boolean(e.isSharedCost),
    isPersonal: Boolean(e.isPersonal)
  };
}
async function notifyTodoAssignees(memberIds, info) {
  await Promise.all(
    memberIds.map(async (memberId) => {
      const member = await getMemberById(memberId);
      if (!member?.profileId) return;
      const profile = await getProfileById(member.profileId);
      if (!profile?.email) return;
      try {
        await sendTodoAssignedEmail({
          to: profile.email,
          assigneeName: member.name,
          creatorName: info.creatorName,
          projectId: info.projectId,
          projectName: info.projectName,
          todoTitle: info.todoTitle
        });
      } catch (error) {
        console.warn("[Todos] Failed to send assignment email:", error);
      }
    })
  );
}
async function notifyMemberJoined(memberIds, info) {
  await Promise.all(
    memberIds.map(async (memberId) => {
      const member = await getMemberById(memberId);
      if (!member?.profileId) return;
      const profile = await getProfileById(member.profileId);
      if (!profile?.email) return;
      try {
        await sendMemberJoinedEmail({
          to: profile.email,
          recipientName: member.name,
          joinedMemberName: info.joinedMemberName,
          projectId: info.projectId,
          projectName: info.projectName
        });
      } catch (error) {
        console.warn("[Members] Failed to send join notification email:", error);
      }
    })
  );
}
function mapTodoRow(t2) {
  return {
    ...t2,
    assigneeIds: JSON.parse(t2.assigneeIds || "[]"),
    doneBy: JSON.parse(t2.doneBy || "[]"),
    isDone: Boolean(t2.isDone)
  };
}
var appRouter = router({
  system: systemRouter,
  // ── 인증 ──────────────────────────────────────────────────
  // 회원가입/로그인/로그아웃은 프론트엔드가 Supabase Auth SDK로 직접 처리한다.
  // 여기서는 Authorization 헤더의 Supabase access token으로 복원된 프로필만 반환.
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    updateName: protectedProcedure.input(z2.object({ name: z2.string().min(1).max(50) })).mutation(async ({ ctx, input }) => {
      await updateProfileName(ctx.user.id, input.name);
      return { success: true };
    })
  }),
  // ── 여행 프로젝트 ─────────────────────────────────────────────
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await getProjectsForUser(ctx.user.id);
      return Promise.all(
        rows.map(async (project) => {
          const [members, expenseRows] = await Promise.all([
            getMembersByProjectId(project.id),
            getExpensesByProjectId(project.id)
          ]);
          const myMemberId = members.find((m) => m.profileId === ctx.user.id)?.id;
          const totalAmount = expenseRows.filter((e) => !Boolean(e.isPersonal) || e.payerId === myMemberId).reduce((s, e) => s + e.amount, 0);
          return { ...project, members, totalAmount };
        })
      );
    }),
    get: protectedProcedure.input(z2.object({ id: z2.string() })).query(async ({ ctx, input }) => {
      const access = await getProjectAccess(input.id, ctx.user.id);
      if (!access) return null;
      const [members, expenseRows, todoRows] = await Promise.all([
        getMembersByProjectId(input.id),
        getExpensesByProjectId(input.id),
        getTodosByProjectId(input.id)
      ]);
      return {
        ...access.project,
        members,
        // 다른 사람의 개인경비는 응답에서 아예 제외 - 클라이언트가 숨기는 게 아니라 서버가 안 보낸다.
        expenses: expenseRows.filter((e) => !Boolean(e.isPersonal) || e.payerId === access.memberId).map(mapExpenseRow),
        todos: todoRows.map(mapTodoRow)
      };
    }),
    create: protectedProcedure.input(
      z2.object({
        name: z2.string().min(1),
        destination: z2.string().min(1),
        startDate: z2.string(),
        endDate: z2.string(),
        myName: z2.string().min(1).default("\uB098")
      })
    ).mutation(async ({ ctx, input }) => {
      const id = nanoid();
      const project = await createProject({
        id,
        userId: ctx.user.id,
        name: input.name,
        destination: input.destination,
        startDate: input.startDate,
        endDate: input.endDate,
        myName: input.myName
      });
      const memberId = nanoid();
      await createMember({
        id: memberId,
        projectId: id,
        name: input.myName,
        isMe: true,
        color: "#6366f1",
        profileId: ctx.user.id
      });
      return {
        ...project,
        members: [{ id: memberId, name: input.myName, isMe: true, color: "#6366f1", projectId: id, profileId: ctx.user.id, createdAt: /* @__PURE__ */ new Date() }],
        expenses: []
      };
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.string(),
        name: z2.string().min(1).optional(),
        destination: z2.string().min(1).optional(),
        startDate: z2.string().optional(),
        endDate: z2.string().optional(),
        myName: z2.string().min(1).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.id, ctx.user.id);
      const { id, ...data } = input;
      await updateProject(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ ctx, input }) => {
      await deleteProject(input.id, ctx.user.id);
      return { success: true };
    }),
    // 읽기 전용 공유 링크 생성/해제 (소유자 전용)
    enableShare: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ ctx, input }) => {
      const token = nanoid(24);
      await setProjectShareToken(input.id, ctx.user.id, token);
      return { token };
    }),
    disableShare: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ ctx, input }) => {
      await setProjectShareToken(input.id, ctx.user.id, null);
      return { success: true };
    }),
    // 공유 링크로 여행 조회 (로그인 불필요, 개인경비는 아예 제외)
    getByToken: publicProcedure.input(z2.object({ token: z2.string() })).query(async ({ input }) => {
      const project = await getProjectByShareToken(input.token);
      if (!project) return null;
      const members = await getMembersByProjectId(project.id);
      const expenseRows = await getExpensesByProjectId(project.id);
      return {
        ...project,
        members,
        expenses: expenseRows.filter((e) => !Boolean(e.isPersonal)).map(mapExpenseRow)
      };
    }),
    // 가입해서 공동 편집하는 초대 링크 + 짧은 초대 코드 생성/해제 (소유자 전용)
    enableEditInvite: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ ctx, input }) => {
      const token = nanoid(24);
      const code = await generateUniqueInviteCode();
      await setProjectEditToken(input.id, ctx.user.id, token, code);
      return { token, code };
    }),
    disableEditInvite: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ ctx, input }) => {
      await setProjectEditToken(input.id, ctx.user.id, null, null);
      return { success: true };
    }),
    // 초대 링크 미리보기 - 로그인은 필요하지만 아직 이 프로젝트 멤버는 아닐 수 있음
    getJoinPreview: protectedProcedure.input(z2.object({ editToken: z2.string() })).query(async ({ input }) => {
      const project = await getProjectByEditToken(input.editToken);
      if (!project) return null;
      const unclaimed = await getUnclaimedMembers(project.id);
      return {
        project: { id: project.id, name: project.name, destination: project.destination },
        members: unclaimed.map((m) => ({ id: m.id, name: m.name, color: m.color }))
      };
    }),
    // 초대 링크로 실제 참여 - 기존 이름표를 본인 계정과 연결하거나, 새 멤버로 참여
    joinByEditToken: protectedProcedure.input(
      z2.object({
        editToken: z2.string(),
        memberId: z2.string().optional(),
        newMemberName: z2.string().min(1).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const project = await getProjectByEditToken(input.editToken);
      if (!project) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uCD08\uB300 \uB9C1\uD06C\uC785\uB2C8\uB2E4" });
      }
      const existingAccess = await getProjectAccess(project.id, ctx.user.id);
      if (existingAccess) return { projectId: project.id };
      let joinedMemberName;
      if (input.memberId) {
        const unclaimed = await getUnclaimedMembers(project.id);
        const target = unclaimed.find((m) => m.id === input.memberId);
        if (!target) {
          throw new TRPCError3({ code: "BAD_REQUEST", message: "\uC120\uD0DD\uD55C \uBA64\uBC84\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
        }
        await claimMember(input.memberId, ctx.user.id);
        joinedMemberName = target.name;
      } else if (input.newMemberName) {
        const existingMembers = await getMembersByProjectId(project.id);
        const color = pickNextColor(existingMembers.map((m) => m.color));
        await createMember({
          id: nanoid(),
          projectId: project.id,
          name: input.newMemberName,
          isMe: false,
          color,
          profileId: ctx.user.id
        });
        joinedMemberName = input.newMemberName;
      } else {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\uCC38\uC5EC\uD560 \uBA64\uBC84\uB97C \uC120\uD0DD\uD558\uAC70\uB098 \uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694" });
      }
      const membersAfterJoin = await getMembersByProjectId(project.id);
      const notifyMemberIds = membersAfterJoin.filter((m) => m.profileId && m.profileId !== ctx.user.id).map((m) => m.id);
      if (notifyMemberIds.length > 0) {
        void notifyMemberJoined(notifyMemberIds, {
          projectId: project.id,
          projectName: project.name,
          joinedMemberName
        });
      }
      return { projectId: project.id };
    })
  }),
  // ── 멤버 ─────────────────────────────────────────────────────────
  members: router({
    add: protectedProcedure.input(
      z2.object({
        projectId: z2.string(),
        name: z2.string().min(1),
        color: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const id = nanoid();
      let color = input.color;
      if (!color) {
        const existingMembers = await getMembersByProjectId(input.projectId);
        color = pickNextColor(existingMembers.map((m) => m.color));
      }
      return createMember({ id, projectId: input.projectId, name: input.name, isMe: false, color });
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.string(),
        name: z2.string().min(1).optional(),
        color: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const member = await getMemberById(input.id);
      if (!member) throw new TRPCError3({ code: "NOT_FOUND", message: "\uBA64\uBC84\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      await assertProjectAccess(member.projectId, ctx.user.id);
      const { id, ...data } = input;
      await updateMember(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ ctx, input }) => {
      const member = await getMemberById(input.id);
      if (!member) throw new TRPCError3({ code: "NOT_FOUND", message: "\uBA64\uBC84\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      await assertProjectAccess(member.projectId, ctx.user.id);
      await deleteMember(input.id);
      return { success: true };
    })
  }),
  // ── 지출 ─────────────────────────────────────────────────────────
  expenses: router({
    add: protectedProcedure.input(
      z2.object({
        projectId: z2.string(),
        title: z2.string().min(1),
        amount: z2.number().positive(),
        category: CategoryEnum,
        payerId: z2.string(),
        participantIds: z2.array(z2.string()),
        date: z2.string().default(""),
        isPreTrip: z2.boolean().default(false),
        isSharedCost: z2.boolean().default(false),
        isPersonal: z2.boolean().default(false),
        note: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const id = nanoid();
      return createExpense({
        id,
        projectId: input.projectId,
        title: input.title,
        amount: input.amount,
        category: input.category,
        payerId: input.payerId,
        participantIds: JSON.stringify(input.participantIds),
        date: input.date,
        isPreTrip: input.isPreTrip,
        isSharedCost: input.isSharedCost,
        isPersonal: input.isPersonal,
        note: input.note ?? null
      });
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.string(),
        title: z2.string().min(1).optional(),
        amount: z2.number().positive().optional(),
        category: CategoryEnum.optional(),
        payerId: z2.string().optional(),
        participantIds: z2.array(z2.string()).optional(),
        date: z2.string().optional(),
        isPreTrip: z2.boolean().optional(),
        isSharedCost: z2.boolean().optional(),
        isPersonal: z2.boolean().optional(),
        note: z2.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const expense = await getExpenseById(input.id);
      if (!expense) throw new TRPCError3({ code: "NOT_FOUND", message: "\uC9C0\uCD9C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      await assertProjectAccess(expense.projectId, ctx.user.id);
      const { id, participantIds, ...rest } = input;
      await updateExpense(id, {
        ...rest,
        ...participantIds !== void 0 ? { participantIds: JSON.stringify(participantIds) } : {}
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ ctx, input }) => {
      const expense = await getExpenseById(input.id);
      if (!expense) throw new TRPCError3({ code: "NOT_FOUND", message: "\uC9C0\uCD9C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      await assertProjectAccess(expense.projectId, ctx.user.id);
      await deleteExpense(input.id);
      return { success: true };
    })
  }),
  // ── 할일 ─────────────────────────────────────────────────────────
  todos: router({
    add: protectedProcedure.input(
      z2.object({
        projectId: z2.string(),
        title: z2.string().min(1),
        assigneeIds: z2.array(z2.string()).default([])
      })
    ).mutation(async ({ ctx, input }) => {
      const access = await assertProjectAccess(input.projectId, ctx.user.id);
      const id = nanoid();
      const todo = await createTodo({
        id,
        projectId: input.projectId,
        title: input.title,
        assigneeIds: JSON.stringify(input.assigneeIds),
        isDone: false,
        doneBy: "[]"
      });
      const otherAssigneeIds = input.assigneeIds.filter((memberId) => memberId !== access.memberId);
      if (otherAssigneeIds.length > 0) {
        void notifyTodoAssignees(otherAssigneeIds, {
          projectId: input.projectId,
          projectName: access.project.name,
          creatorName: ctx.user.name ?? "\uB204\uAD70\uAC00",
          todoTitle: input.title
        });
      }
      return todo;
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.string(),
        title: z2.string().min(1).optional(),
        assigneeIds: z2.array(z2.string()).optional(),
        isDone: z2.boolean().optional(),
        doneBy: z2.array(z2.string()).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const todo = await getTodoById(input.id);
      if (!todo) throw new TRPCError3({ code: "NOT_FOUND", message: "\uD560\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      await assertProjectAccess(todo.projectId, ctx.user.id);
      const { id, assigneeIds, doneBy, ...rest } = input;
      await updateTodo(id, {
        ...rest,
        ...assigneeIds !== void 0 ? { assigneeIds: JSON.stringify(assigneeIds) } : {},
        ...doneBy !== void 0 ? { doneBy: JSON.stringify(doneBy) } : {}
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ ctx, input }) => {
      const todo = await getTodoById(input.id);
      if (!todo) throw new TRPCError3({ code: "NOT_FOUND", message: "\uD560\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      await assertProjectAccess(todo.projectId, ctx.user.id);
      await deleteTodo(input.id);
      return { success: true };
    })
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/auth.ts
import { createClient } from "@supabase/supabase-js";
var supabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey);
function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return void 0;
  return header.slice("Bearer ".length);
}
async function authenticateRequest(req) {
  const token = getBearerToken(req);
  if (!token) {
    throw ForbiddenError("Missing access token");
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw ForbiddenError("Invalid or expired access token");
  }
  const authUser = data.user;
  let profile = await getProfileById(authUser.id);
  if (!profile) {
    if (!authUser.email) {
      throw ForbiddenError("Account has no email");
    }
    profile = await createProfile({
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name ?? authUser.user_metadata?.full_name ?? null
    });
  }
  if (!profile) {
    throw ForbiddenError("Failed to load profile");
  }
  return profile;
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await authenticateRequest(opts.req);
  } catch (error) {
    console.error("[Auth] authenticateRequest failed:", error);
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/app.ts
function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}

// server/_core/vercelHandler.ts
var vercelHandler_default = createApp();
export {
  vercelHandler_default as default
};
