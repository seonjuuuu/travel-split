import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.me", () => {
  it("returns current user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeDefined();
    expect(me?.name).toBe("Test User 1");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});

describe("projects", () => {
  it("creates and lists a project", async () => {
    const { ctx } = createAuthContext(999);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.projects.create({
      name: "테스트 여행",
      destination: "제주도",
      startDate: "2025-01-01",
      endDate: "2025-01-05",
      myName: "나",
    });

    expect(created.name).toBe("테스트 여행");
    expect(created.destination).toBe("제주도");
    expect(created.members).toHaveLength(1);
    expect(created.members[0]?.isMe).toBe(true);

    const list = await caller.projects.list();
    const found = list.find((p) => p.id === created.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("테스트 여행");

    // cleanup
    await caller.projects.delete({ id: created.id });
  });

  it("updates a project", async () => {
    const { ctx } = createAuthContext(998);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.projects.create({
      name: "수정 전",
      destination: "서울",
      startDate: "2025-02-01",
      endDate: "2025-02-03",
      myName: "나",
    });

    await caller.projects.update({ id: created.id, name: "수정 후" });

    const updated = await caller.projects.get({ id: created.id });
    expect(updated?.name).toBe("수정 후");

    // cleanup
    await caller.projects.delete({ id: created.id });
  });
});

describe("members", () => {
  it("adds and deletes a member", async () => {
    const { ctx } = createAuthContext(997);
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "멤버 테스트",
      destination: "부산",
      startDate: "2025-03-01",
      endDate: "2025-03-03",
      myName: "나",
    });

    const member = await caller.members.add({
      projectId: project.id,
      name: "친구A",
      color: "#ec4899",
    });

    expect(member.name).toBe("친구A");

    await caller.members.delete({ id: member.id });

    const updated = await caller.projects.get({ id: project.id });
    const memberExists = updated?.members.some((m) => m.id === member.id);
    expect(memberExists).toBe(false);

    // cleanup
    await caller.projects.delete({ id: project.id });
  });
});

describe("expenses", () => {
  it("adds and deletes an expense", async () => {
    const { ctx } = createAuthContext(996);
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "지출 테스트",
      destination: "도쿄",
      startDate: "2025-04-01",
      endDate: "2025-04-05",
      myName: "나",
    });

    const myMemberId = project.members[0]?.id ?? "";

    const expense = await caller.expenses.add({
      projectId: project.id,
      title: "점심 식사",
      amount: 15000,
      category: "식비",
      payerId: myMemberId,
      participantIds: [myMemberId],
      date: "2025-04-02",
      isPreTrip: false,
    });

    expect(expense.title).toBe("점심 식사");
    expect(expense.amount).toBe(15000);

    await caller.expenses.delete({ id: expense.id });

    const updated = await caller.projects.get({ id: project.id });
    const expenseExists = updated?.expenses.some((e) => e.id === expense.id);
    expect(expenseExists).toBe(false);

    // cleanup
    await caller.projects.delete({ id: project.id });
  });

  it("adds a pre-trip expense without date", async () => {
    const { ctx } = createAuthContext(995);
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "사전결제 테스트",
      destination: "파리",
      startDate: "2025-05-01",
      endDate: "2025-05-07",
      myName: "나",
    });

    const myMemberId = project.members[0]?.id ?? "";

    const expense = await caller.expenses.add({
      projectId: project.id,
      title: "항공권",
      amount: 500000,
      category: "교통",
      payerId: myMemberId,
      participantIds: [myMemberId],
      date: "",
      isPreTrip: true,
    });

    expect(expense.isPreTrip).toBe(true);
    expect(expense.date).toBe("");

    // cleanup
    await caller.projects.delete({ id: project.id });
  });
});
