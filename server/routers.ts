import { TRPCError } from "@trpc/server";
import { customAlphabet, nanoid } from "nanoid";
import { z } from "zod";
import type { DbExpense, DbTodo } from "../drizzle/schema";
import { sendMemberJoinedEmail, sendTodoAssignedEmail } from "./_core/mail";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  claimMember,
  createExpense,
  createMember,
  createProject,
  createTodo,
  deleteExpense,
  deleteMember,
  deleteProject,
  deleteTodo,
  getExpenseById,
  getExpensesByProjectId,
  getMemberById,
  getMembersByProjectId,
  getProfileById,
  getProjectAccess,
  getProjectByEditToken,
  getProjectByShareToken,
  getProjectsForUser,
  getTodoById,
  getTodosByProjectId,
  getUnclaimedMembers,
  isInviteCodeTaken,
  setProjectEditToken,
  setProjectShareToken,
  updateExpense,
  updateMember,
  updateProfileName,
  updateProject,
  updateTodo,
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

// 헷갈리는 문자(0/O, 1/I/L 등) 제외한 6자리 초대 코드
const generateInviteCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    if (!(await isInviteCodeTaken(code))) return code;
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "초대 코드 생성에 실패했습니다. 다시 시도해주세요" });
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

// 계정 연결된(profileId 있는) 담당자한테만 이메일 발송 가능 - 미참여 이름표 멤버는 이메일 주소가 없어서 건너뜀
async function notifyTodoAssignees(
  memberIds: string[],
  info: { projectId: string; projectName: string; creatorName: string; todoTitle: string }
) {
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
          todoTitle: info.todoTitle,
        });
      } catch (error) {
        console.warn("[Todos] Failed to send assignment email:", error);
      }
    })
  );
}

// 새 멤버 참여를 이미 계정 연결된(참여 중인) 다른 멤버들한테 이메일로 알림
async function notifyMemberJoined(
  memberIds: string[],
  info: { projectId: string; projectName: string; joinedMemberName: string }
) {
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
          projectName: info.projectName,
        });
      } catch (error) {
        console.warn("[Members] Failed to send join notification email:", error);
      }
    })
  );
}

function mapTodoRow(t: DbTodo) {
  return {
    ...t,
    assigneeIds: JSON.parse(t.assigneeIds || "[]") as string[],
    doneBy: JSON.parse(t.doneBy || "[]") as string[],
    isDone: Boolean(t.isDone),
  };
}

export const appRouter = router({
  system: systemRouter,

  // ── 인증 ──────────────────────────────────────────────────
  // 회원가입/로그인/로그아웃은 프론트엔드가 Supabase Auth SDK로 직접 처리한다.
  // 여기서는 Authorization 헤더의 Supabase access token으로 복원된 프로필만 반환.
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    updateName: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        await updateProfileName(ctx.user.id, input.name);
        return { success: true };
      }),
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
          const myMemberId = members.find((m) => m.profileId === ctx.user.id)?.id;
          // 다른 사람의 개인경비는 상세 페이지와 동일하게 합계에서 제외
          const totalAmount = expenseRows
            .filter((e) => !Boolean(e.isPersonal) || e.payerId === myMemberId)
            .reduce((s, e) => s + e.amount, 0);
          return { ...project, members, totalAmount };
        })
      );
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const access = await getProjectAccess(input.id, ctx.user.id);
        if (!access) return null;
        const [members, expenseRows, todoRows] = await Promise.all([
          getMembersByProjectId(input.id),
          getExpensesByProjectId(input.id),
          getTodosByProjectId(input.id),
        ]);
        return {
          ...access.project,
          members,
          // 다른 사람의 개인경비는 응답에서 아예 제외 - 클라이언트가 숨기는 게 아니라 서버가 안 보낸다.
          expenses: expenseRows
            .filter((e) => !Boolean(e.isPersonal) || e.payerId === access.memberId)
            .map(mapExpenseRow),
          todos: todoRows.map(mapTodoRow),
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

    // 가입해서 공동 편집하는 초대 링크 + 짧은 초대 코드 생성/해제 (소유자 전용)
    enableEditInvite: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(24);
        const code = await generateUniqueInviteCode();
        await setProjectEditToken(input.id, ctx.user.id, token, code);
        return { token, code };
      }),

    disableEditInvite: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await setProjectEditToken(input.id, ctx.user.id, null, null);
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

        let joinedMemberName: string;

        if (input.memberId) {
          const unclaimed = await getUnclaimedMembers(project.id);
          const target = unclaimed.find((m) => m.id === input.memberId);
          if (!target) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "선택한 멤버를 찾을 수 없습니다" });
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
            profileId: ctx.user.id,
          });
          joinedMemberName = input.newMemberName;
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "참여할 멤버를 선택하거나 이름을 입력해주세요" });
        }

        // 이미 참여 중인(계정 연결된) 다른 멤버들한테 새 멤버 참여 알림 이메일
        const membersAfterJoin = await getMembersByProjectId(project.id);
        const notifyMemberIds = membersAfterJoin
          .filter((m) => m.profileId && m.profileId !== ctx.user.id)
          .map((m) => m.id);
        if (notifyMemberIds.length > 0) {
          void notifyMemberJoined(notifyMemberIds, {
            projectId: project.id,
            projectName: project.name,
            joinedMemberName,
          });
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

  // ── 할일 ─────────────────────────────────────────────────────────
  todos: router({
    add: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          title: z.string().min(1),
          assigneeIds: z.array(z.string()).default([]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const access = await assertProjectAccess(input.projectId, ctx.user.id);
        const id = nanoid();
        const todo = await createTodo({
          id,
          projectId: input.projectId,
          title: input.title,
          assigneeIds: JSON.stringify(input.assigneeIds),
          isDone: false,
          doneBy: "[]",
        });

        // 나 자신 말고 다른 담당자한테만 이메일 알림 (실패해도 할일 등록 자체는 성공 처리)
        const otherAssigneeIds = input.assigneeIds.filter((memberId) => memberId !== access.memberId);
        if (otherAssigneeIds.length > 0) {
          void notifyTodoAssignees(otherAssigneeIds, {
            projectId: input.projectId,
            projectName: access.project.name,
            creatorName: ctx.user.name ?? "누군가",
            todoTitle: input.title,
          });
        }

        return todo;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().min(1).optional(),
          assigneeIds: z.array(z.string()).optional(),
          isDone: z.boolean().optional(),
          doneBy: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const todo = await getTodoById(input.id);
        if (!todo) throw new TRPCError({ code: "NOT_FOUND", message: "할일을 찾을 수 없습니다" });
        await assertProjectAccess(todo.projectId, ctx.user.id);
        const { id, assigneeIds, doneBy, ...rest } = input;
        await updateTodo(id, {
          ...rest,
          ...(assigneeIds !== undefined ? { assigneeIds: JSON.stringify(assigneeIds) } : {}),
          ...(doneBy !== undefined ? { doneBy: JSON.stringify(doneBy) } : {}),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const todo = await getTodoById(input.id);
        if (!todo) throw new TRPCError({ code: "NOT_FOUND", message: "할일을 찾을 수 없습니다" });
        await assertProjectAccess(todo.projectId, ctx.user.id);
        await deleteTodo(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
