// 여행 정산 앱 - 핵심 타입 정의
// Design: Scandinavian Minimal + Travel Scrapbook
// Colors: Indigo primary, pastel category colors, white background

export type ExpenseCategory =
  | "식비"
  | "교통"
  | "숙박"
  | "관광"
  | "쇼핑"
  | "기타";

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { color: string; bg: string; icon: string; textColor: string }
> = {
  식비: {
    color: "#22c55e",
    bg: "#dcfce7",
    icon: "🍽️",
    textColor: "#15803d",
  },
  교통: {
    color: "#3b82f6",
    bg: "#dbeafe",
    icon: "🚌",
    textColor: "#1d4ed8",
  },
  숙박: {
    color: "#a855f7",
    bg: "#f3e8ff",
    icon: "🏨",
    textColor: "#7e22ce",
  },
  관광: {
    color: "#f97316",
    bg: "#ffedd5",
    icon: "🗺️",
    textColor: "#c2410c",
  },
  쇼핑: {
    color: "#ec4899",
    bg: "#fce7f3",
    icon: "🛍️",
    textColor: "#be185d",
  },
  기타: {
    color: "#6b7280",
    bg: "#f3f4f6",
    icon: "📌",
    textColor: "#374151",
  },
};

export interface Member {
  id: string;
  name: string;
  isMe: boolean;
  color: string; // avatar background color
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  payerId: string; // who paid
  participantIds: string[]; // who shares the cost
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface TravelProject {
  id: string;
  name: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  members: Member[];
  expenses: Expense[];
  createdAt: string;
}

export interface Settlement {
  fromId: string;
  toId: string;
  amount: number;
  settled: boolean;
}

// 정산 계산 결과
export interface SettlementResult {
  memberId: string;
  memberName: string;
  totalPaid: number; // 실제로 낸 돈
  totalShare: number; // 내야 할 돈
  balance: number; // 양수 = 받을 돈, 음수 = 줄 돈
}

export const MEMBER_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f97316", // orange
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ef4444", // red
  "#14b8a6", // teal
];

// 날짜 유틸리티
export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
}

export function formatDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", { weekday: "short" });
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

// 정산 계산 로직
export function calculateSettlements(
  members: Member[],
  expenses: Expense[]
): { results: SettlementResult[]; transfers: Settlement[] } {
  const results: SettlementResult[] = members.map((m) => ({
    memberId: m.id,
    memberName: m.name,
    totalPaid: 0,
    totalShare: 0,
    balance: 0,
  }));

  expenses.forEach((expense) => {
    const payer = results.find((r) => r.memberId === expense.payerId);
    if (payer) {
      payer.totalPaid += expense.amount;
    }

    const participants = expense.participantIds.length > 0
      ? expense.participantIds
      : members.map((m) => m.id);
    
    const sharePerPerson = expense.amount / participants.length;
    participants.forEach((pid) => {
      const member = results.find((r) => r.memberId === pid);
      if (member) {
        member.totalShare += sharePerPerson;
      }
    });
  });

  results.forEach((r) => {
    r.balance = r.totalPaid - r.totalShare;
  });

  // 최소 이체 계산 (greedy)
  const transfers: Settlement[] = [];
  const debtors = results
    .filter((r) => r.balance < -0.01)
    .map((r) => ({ id: r.memberId, amount: -r.balance }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = results
    .filter((r) => r.balance > 0.01)
    .map((r) => ({ id: r.memberId, amount: r.balance }))
    .sort((a, b) => b.amount - a.amount);

  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.01) {
      transfers.push({
        fromId: debtors[i].id,
        toId: creditors[j].id,
        amount: Math.round(transfer),
        settled: false,
      });
    }
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return { results, transfers };
}
