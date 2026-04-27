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
  projectId?: string;
  createdAt?: Date | string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  payerId: string; // who paid
  participantIds: string[]; // who shares the cost
  date: string; // YYYY-MM-DD (사전 결제는 빈 문자열 허용)
  note?: string | null;
  isPreTrip?: boolean; // 여행 전 사전 결제 여부 (날짜 무관)
  isSharedCost?: boolean; // 공동경비 - 정산 제외 (결제자 없이 공동 부담)
}

export interface TravelProject {
  id: string;
  name: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  members: Member[];
  expenses: Expense[];
  createdAt: string | Date;
  updatedAt?: string | Date;
  userId?: number;
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
  totalPaid: number; // 정산 대상 지출에서 낙 돈
  totalShare: number; // 내야 할 돈
  balance: number; // 양수 = 받을 돈, 음수 = 줄 돈
  sharedCostPaid: number; // 공동경비로 낙 돈 (정산 제외)
}

export const MEMBER_COLORS = [
  "#6366f1", // 인디고
  "#ef4444", // 빨강
  "#f97316", // 주황
  "#eab308", // 노랑
  "#22c55e", // 초록
  "#14b8a6", // 청록
  "#3b82f6", // 파랑
  "#8b5cf6", // 보라
  "#ec4899", // 핑크
  "#06b6d4", // 시안
  "#84cc16", // 라임
  "#f43f5e", // 로즈
];

export const MEMBER_COLOR_NAMES: Record<string, string> = {
  "#6366f1": "인디고",
  "#ef4444": "빨강",
  "#f97316": "주황",
  "#eab308": "노랑",
  "#22c55e": "초록",
  "#14b8a6": "청록",
  "#3b82f6": "파랑",
  "#8b5cf6": "보라",
  "#ec4899": "핑크",
  "#06b6d4": "시안",
  "#84cc16": "라임",
  "#f43f5e": "로즈",
};

// 기존 멤버 색상과 겹치지 않는 다음 색상 자동 배정
export function getNextMemberColor(usedColors: string[]): string {
  const available = MEMBER_COLORS.filter(c => !usedColors.includes(c));
  if (available.length > 0) return available[0];
  return MEMBER_COLORS[usedColors.length % MEMBER_COLORS.length];
}

// 사전 결제 여부 판별 (isPreTrip 플래그 우선, 없으면 날짜로 판별)
export function isPreTripExpense(expense: Expense, projectStartDate: string): boolean {
  if (Boolean(expense.isPreTrip) === true) return true;
  if (Boolean(expense.isPreTrip) === false) return false;
  return expense.date < projectStartDate;
}

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
  if (!dateStr || dateStr === "pre-trip") return "사전 결제";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "날짜 미지정";
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
  if (!dateStr || dateStr === "pre-trip") return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
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
    sharedCostPaid: 0,
  }));

  expenses.forEach((expense) => {
    // 공동경비는 정산 계산에서 제외 - 하지만 멤버별 지출 통계에는 포함
    if (Boolean(expense.isSharedCost)) {
      // 공동경비: 항상 전체 멤버 수로 균등 분배 (결제자 상관없이 모두가 함께 낸 돈)
      const share = expense.amount / members.length;
      results.forEach((r) => { r.sharedCostPaid += share; });
      return;
    }

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
