import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { DbExpense } from "../drizzle/schema";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  claimMember,
  createExpense,
  createMember,
  createProject,
  deleteExpense,
  deleteMember,
  deleteProject,
  getExpenseById,
  getExpensesByProjectId,
  getMemberById,
  getMembersByProjectId,
  getProjectAccess,
  getProjectByEditToken,
  getProjectByShareToken,
  getProjectsForUser,
  getUnclaimedMembers,
  setProjectEditToken,
  setProjectShareToken,
  updateExpense,
  updateMember,
  updateProject,
} from "./db";

const CategoryEnum = z.enum(["식비", "교통", "숙박", "관광", "쇼핑", "기타"]);
const MEMBER_COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f43f5e",
];

function pickNextColor(usedColors: string[]): string {
  const available = MEMBER_COLORS.filter((c) => !usedColors.includes(c));
  return available.length > 0 ? available[0] : MEMBER_COLORS[usedColors.length % MEMBER_COLORS.length];
}

// 소유자든 초대받은 협업자든 동일한 규칙으로 접근 권한을 확인한다.
async function assertProjectAccess(projectId: string, userId: string) {
  const access = await getProjectAccess(projectId, userId);
  if (!access) {
    throw new TRPCError({ code: "FORBIDDEN", message: "이 프로젝트에 접근할 권한이 없습니다" });
  }
  return access;
}

function mapExpenseRow(e: DbExpense) {
  return {
    ...e,
    participantIds: JSON.parse(e.participantIds || "[]") as string[],
    isPreTrip: Boolean(e.isPreTrip),
    isSharedCost: Boolean(e.isSharedCost),
    isPersonal: Boolean(e.isPersonal),
  };
}

export const appRouter = router({
  system: systemRouter,

  // ── 인증 ──────────────────────────────────────────────────
  // 회원가입/로그인/로그아웃은 프론트엔드가 Supabase Auth SDK로 직접 처리한다.
  // 여기서는 Authorization 헤더의 Supabase access token으로 복원된 프로필만 반환.
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
  }),

  // ── 여행 프로젝트 ─────────────────────────────────────────────
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await getProjectsForUser(ctx.user.id);
      return Promise.all(
        rows.map(async (project) => {
          const [members, expenseRows] = await Promise.all([
            getMembersByProjectId(project.id),
            getExpensesByProjectId(project.id),
          ]);
          const totalAmount = expenseRows.reduce((s, e) => s + e.amount, 0);
          return { ...project, members, totalAmount };
        })
      );
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const access = await getProjectAccess(input.id, ctx.user.id);
        if (!access) return null;
        const members = await getMembersByProjectId(input.id);
        const expenseRows = await getExpensesByProjectId(input.id);
        return {
          ...access.project,
          members,
          // 다른 사람의 개인경비는 응답에서 아예 제외 - 클라이언트가 숨기는 게 아니라 서버가 안 보낸다.
          expenses: expenseRows
            .filter((e) => !Boolean(e.isPersonal) || e.payerId === access.memberId)
            .map(mapExpenseRow),
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
          profileId: ctx.user.id,
        });
        return {
          ...project,
          members: [{ id: memberId, name: input.myName, isMe: true, color: "#6366f1", projectId: id, profileId: ctx.user.id, createdAt: new Date() }],
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
        await assertProjectAccess(input.id, ctx.user.id);
        const { id, ...data } = input;
        await updateProject(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // 프로젝트 삭제는 소유자만 (updateProject/deleteProject 자체가 userId 일치 여부로 걸러줌)
        await deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),

    // 읽기 전용 공유 링크 생성/해제 (소유자 전용)
    enableShare: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(24);
        await setProjectShareToken(input.id, ctx.user.id, token);
        return { token };
      }),

    disableShare: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await setProjectShareToken(input.id, ctx.user.id, null);
        return { success: true };
      }),

    // 공유 링크로 여행 조회 (로그인 불필요, 개인경비는 아예 제외)
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
          expenses: expenseRows
            .filter((e) => !Boolean(e.isPersonal))
            .map(mapExpenseRow),
        };
      }),

    // 가입해서 공동 편집하는 초대 링크 생성/해제 (소유자 전용)
    enableEditInvite: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(24);
        await setProjectEditToken(input.id, ctx.user.id, token);
        return { token };
      }),

    disableEditInvite: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await setProjectEditToken(input.id, ctx.user.id, null);
        return { success: true };
      }),

    // 초대 링크 미리보기 - 로그인은 필요하지만 아직 이 프로젝트 멤버는 아닐 수 있음
    getJoinPreview: protectedProcedure
      .input(z.object({ editToken: z.string() }))
      .query(async ({ input }) => {
        const project = await getProjectByEditToken(input.editToken);
        if (!project) return null;
        const unclaimed = await getUnclaimedMembers(project.id);
        return {
          project: { id: project.id, name: project.name, destination: project.destination },
          members: unclaimed.map((m) => ({ id: m.id, name: m.name, color: m.color })),
        };
      }),

    // 초대 링크로 실제 참여 - 기존 이름표를 본인 계정과 연결하거나, 새 멤버로 참여
    joinByEditToken: protectedProcedure
      .input(
        z.object({
          editToken: z.string(),
          memberId: z.string().optional(),
          newMemberName: z.string().min(1).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectByEditToken(input.editToken);
        if (!project) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않은 초대 링크입니다" });
        }

        // 이미 참여 중이면 그대로 프로젝트로 안내
        const existingAccess = await getProjectAccess(project.id, ctx.user.id);
        if (existingAccess) return { projectId: project.id };

        if (input.memberId) {
          const unclaimed = await getUnclaimedMembers(project.id);
          const target = unclaimed.find((m) => m.id === input.memberId);
          if (!target) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "선택한 멤버를 찾을 수 없습니다" });
          }
          await claimMember(input.memberId, ctx.user.id);
        } else if (input.newMemberName) {
          const existingMembers = await getMembersByProjectId(project.id);
          const color = pickNextColor(existingMembers.map((m) => m.color));
          await createMember({
            id: nanoid(),
            projectId: project.id,
            name: input.newMemberName,
            isMe: false,
            color,
            profileId: ctx.user.id,
          });
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "참여할 멤버를 선택하거나 이름을 입력해주세요" });
        }

        return { projectId: project.id };
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
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        const id = nanoid();
        let color = input.color;
        if (!color) {
          const existingMembers = await getMembersByProjectId(input.projectId);
          color = pickNextColor(existingMembers.map((m) => m.color));
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
      .mutation(async ({ ctx, input }) => {
        const member = await getMemberById(input.id);
        if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "멤버를 찾을 수 없습니다" });
        await assertProjectAccess(member.projectId, ctx.user.id);
        const { id, ...data } = input;
        await updateMember(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const member = await getMemberById(input.id);
        if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "멤버를 찾을 수 없습니다" });
        await assertProjectAccess(member.projectId, ctx.user.id);
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
          isPersonal: z.boolean().default(false),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
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
          isPersonal: z.boolean().optional(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const expense = await getExpenseById(input.id);
        if (!expense) throw new TRPCError({ code: "NOT_FOUND", message: "지출을 찾을 수 없습니다" });
        await assertProjectAccess(expense.projectId, ctx.user.id);
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
      .mutation(async ({ ctx, input }) => {
        const expense = await getExpenseById(input.id);
        if (!expense) throw new TRPCError({ code: "NOT_FOUND", message: "지출을 찾을 수 없습니다" });
        await assertProjectAccess(expense.projectId, ctx.user.id);
        await deleteExpense(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
