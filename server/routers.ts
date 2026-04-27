import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createExpense,
  createMember,
  createProject,
  deleteExpense,
  deleteMember,
  deleteProject,
  getExpensesByProjectId,
  getMembersByProjectId,
  getProjectById,
  getProjectByShareToken,
  getProjectsByUserId,
  setProjectShareToken,
  updateExpense,
  updateMember,
  updateProject,
} from "./db";

const CategoryEnum = z.enum(["식비", "교통", "숙박", "관광", "쇼핑", "기타"]);

export const appRouter = router({
  system: systemRouter,

  // ── 인증 ──────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── 여행 프로젝트 ─────────────────────────────────────────────
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getProjectsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.id, ctx.user.id);
        if (!project) return null;
        const members = await getMembersByProjectId(input.id);
        const expenseRows = await getExpensesByProjectId(input.id);
        return {
          ...project,
          members,
          expenses: expenseRows.map((e) => ({
            ...e,
            participantIds: JSON.parse(e.participantIds || "[]") as string[],
            isPreTrip: Boolean(e.isPreTrip),
            isSharedCost: Boolean(e.isSharedCost),
          })),
        };
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          destination: z.string().min(1),
          startDate: z.string(),
          endDate: z.string(),
          myName: z.string().min(1).default("나"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = nanoid();
        const project = await createProject({
          id,
          userId: ctx.user.id,
          name: input.name,
          destination: input.destination,
          startDate: input.startDate,
          endDate: input.endDate,
          myName: input.myName,
        });
        const memberId = nanoid();
        await createMember({
          id: memberId,
          projectId: id,
          name: input.myName,
          isMe: true,
          color: "#6366f1",
        });
        return {
          ...project,
          members: [{ id: memberId, name: input.myName, isMe: true, color: "#6366f1", projectId: id, createdAt: new Date() }],
          expenses: [],
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          destination: z.string().min(1).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          myName: z.string().min(1).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateProject(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),

    // 공유 링크 토큰 생성 (ON)
    enableShare: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // 16바이트 랜덤 토큰 생성
        const token = nanoid(24);
        await setProjectShareToken(input.id, ctx.user.id, token);
        return { token };
      }),

    // 공유 링크 토큰 삭제 (OFF)
    disableShare: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await setProjectShareToken(input.id, ctx.user.id, null);
        return { success: true };
      }),

    // 공유 링크로 여행 조회 (로그인 불필요)
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const project = await getProjectByShareToken(input.token);
        if (!project) return null;
        const members = await getMembersByProjectId(project.id);
        const expenseRows = await getExpensesByProjectId(project.id);
        return {
          ...project,
          members,
          expenses: expenseRows.map((e) => ({
            ...e,
            participantIds: JSON.parse(e.participantIds || "[]") as string[],
            isPreTrip: Boolean(e.isPreTrip),
            isSharedCost: Boolean(e.isSharedCost),
          })),
        };
      }),
  }),

  // ── 멤버 ─────────────────────────────────────────────────────────
  members: router({
    add: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          name: z.string().min(1),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = nanoid();
        // 색상 자동 배정: 클라이언트가 전달하지 않으면 기존 멤버와 겹치지 않는 색상 선택
        let color = input.color;
        if (!color) {
          const COLORS = ["#6366f1","#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f43f5e"];
          const existingMembers = await getMembersByProjectId(input.projectId);
          const usedColors = existingMembers.map((m: { color: string }) => m.color);
          const available = COLORS.filter(c => !usedColors.includes(c));
          color = available.length > 0 ? available[0] : COLORS[usedColors.length % COLORS.length];
        }
        return createMember({ id, projectId: input.projectId, name: input.name, isMe: false, color });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateMember(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteMember(input.id);
        return { success: true };
      }),
  }),

  // ── 지출 ─────────────────────────────────────────────────────────
  expenses: router({
    add: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          title: z.string().min(1),
          amount: z.number().positive(),
          category: CategoryEnum,
          payerId: z.string(),
          participantIds: z.array(z.string()),
          date: z.string().default(""),
          isPreTrip: z.boolean().default(false),
          isSharedCost: z.boolean().default(false),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
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
          note: input.note ?? null,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().min(1).optional(),
          amount: z.number().positive().optional(),
          category: CategoryEnum.optional(),
          payerId: z.string().optional(),
          participantIds: z.array(z.string()).optional(),
          date: z.string().optional(),
          isPreTrip: z.boolean().optional(),
          isSharedCost: z.boolean().optional(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, participantIds, ...rest } = input;
        await updateExpense(id, {
          ...rest,
          ...(participantIds !== undefined
            ? { participantIds: JSON.stringify(participantIds) }
            : {}),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteExpense(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
