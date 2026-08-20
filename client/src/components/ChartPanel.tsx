// 그래프 패널 컴포넌트
// Design: Clean charts with category colors and member breakdown

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Tag } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import type { Expense, TravelProject, ExpenseCategory } from "@/lib/types";
import { CATEGORY_CONFIG, formatAmount, formatDate } from "@/lib/types";

interface Props {
  project: TravelProject;
  selectedDate: string | null;
}

type ViewMode = "all" | "settlement" | "personal";

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "settlement", label: "정산 대상만" },
  { key: "personal", label: "개인경비" },
];

function filterByView(list: Expense[], viewMode: ViewMode): Expense[] {
  if (viewMode === "settlement")
    return list.filter((e) => !Boolean(e.isPersonal) && !Boolean(e.isSharedCost));
  if (viewMode === "personal") return list.filter((e) => Boolean(e.isPersonal));
  return list;
}

export default function ChartPanel({ project, selectedDate }: Props) {
  const { user } = useAuth();
  const myMemberId =
    project.members.find((m) => m.profileId === user?.id)?.id ??
    project.members.find((m) => m.isMe)?.id;

  const [viewMode, setViewMode] = useState<ViewMode>("settlement");
  // "개인경비" 탭에서 개인경비 전액 + 정산 대상 지출 중 내가 부담할 몫까지 합쳐서 보고 싶을 때 체크
  const [includeMyShare, setIncludeMyShare] = useState(true);

  const dateFiltered = selectedDate
    ? project.expenses.filter((e) => e.date === selectedDate)
    : project.expenses;
  const expenses = filterByView(dateFiltered, viewMode);

  // 정산 대상 지출(개인경비·공동경비 제외) 중 내가 참여자로 포함된 것의 "내 몫"만 추출
  const myShareExtras: { category: ExpenseCategory; amount: number; date: string }[] =
    viewMode === "personal" && includeMyShare && myMemberId
      ? dateFiltered
          .filter((e) => !Boolean(e.isPersonal) && !Boolean(e.isSharedCost))
          .flatMap((e) => {
            const participants =
              e.participantIds.length > 0 ? e.participantIds : project.members.map((m) => m.id);
            if (!participants.includes(myMemberId)) return [];
            return [{ category: e.category, amount: e.amount / participants.length, date: e.date }];
          })
      : [];

  const viewTabs = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1.5 bg-gray-100 rounded-full p-1 w-fit">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setViewMode(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              viewMode === tab.key
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {viewMode === "personal" && myMemberId && (
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={includeMyShare}
            onChange={(e) => setIncludeMyShare(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-violet-600"
          />
          정산 대상 지출 중 내 몫까지 합쳐서 보기
        </label>
      )}
    </div>
  );

  if (expenses.length === 0) {
    const emptyMessage = selectedDate
      ? "이 날의 지출이 없어요"
      : viewMode === "personal"
        ? "개인 지출이 없어요"
        : viewMode === "settlement"
          ? "정산 대상 지출이 없어요"
          : "아직 지출이 없어요";
    return (
      <div className="space-y-4">
        {viewTabs}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-gray-500 font-medium mb-1">{emptyMessage}</p>
          <p className="text-sm text-gray-400">지출을 추가하면 그래프가 표시됩니다</p>
        </div>
      </div>
    );
  }

  // 카테고리별 합계 (개인경비 탭 + 체크 시 내 정산 몫도 같은 카테고리에 합산)
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  myShareExtras.forEach((x) => {
    categoryTotals[x.category] = (categoryTotals[x.category] || 0) + x.amount;
  });
  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_CONFIG[name as ExpenseCategory]?.color || "#6b7280",
      bg: CATEGORY_CONFIG[name as ExpenseCategory]?.bg || "#f3f4f6",
      icon: CATEGORY_CONFIG[name as ExpenseCategory]?.icon || Tag,
    }))
    .sort((a, b) => b.value - a.value);

  const totalExpense =
    expenses.reduce((s, e) => s + e.amount, 0) +
    myShareExtras.reduce((s, x) => s + x.amount, 0);

  // 멤버별 결제 합계 (개인경비 탭 + 체크 시 "나"의 몫에 정산 몫도 합산)
  const myShareTotal = myShareExtras.reduce((s, x) => s + x.amount, 0);
  const memberData = project.members
    .map((m) => {
      let paid = expenses.filter((e) => e.payerId === m.id).reduce((s, e) => s + e.amount, 0);
      if (m.id === myMemberId) paid += myShareTotal;
      return { name: m.name, paid, color: m.color };
    })
    .filter((m) => m.paid > 0)
    .sort((a, b) => b.paid - a.paid);

  // 날짜별 지출 (전체 보기일 때만)
  const dailyTotals: Record<string, number> = {};
  if (!selectedDate) {
    expenses.forEach((e) => {
      if (Boolean(e.isPreTrip) || !e.date) return;
      dailyTotals[e.date] = (dailyTotals[e.date] || 0) + e.amount;
    });
    myShareExtras.forEach((x) => {
      if (!x.date) return;
      dailyTotals[x.date] = (dailyTotals[x.date] || 0) + x.amount;
    });
  }
  const dailyData = !selectedDate
    ? Object.entries(dailyTotals)
        .map(([date, amount]) => ({
          date: formatDate(date),
          amount,
          fullDate: date,
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
    : [];

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { name: string; value: number; payload: { color: string } }[];
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-indigo-600 font-bold">
            {formatAmount(payload[0].value)}
          </p>
          <p className="text-gray-400">
            {((payload[0].value / totalExpense) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {viewTabs}

      {/* 카테고리별 파이 차트 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-4">카테고리별 지출</h3>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 범례 */}
          <div className="flex-1 space-y-2 w-full">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cat.bg }}
                >
                  <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700">
                      {cat.name}
                    </span>
                    <span className="text-xs font-bold text-gray-900">
                      {formatAmount(cat.value)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(cat.value / totalExpense) * 100}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0 w-10 text-right">
                  {((cat.value / totalExpense) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 멤버별 결제 금액 */}
      {memberData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">
            {viewMode === "personal" ? "멤버별 개인 지출" : "멤버별 결제 금액"}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatAmount(value),
                    viewMode === "personal" ? "개인 지출" : "결제 금액",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #f3f4f6",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="paid" radius={[6, 6, 0, 0]}>
                  {memberData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 날짜별 지출 추이 */}
      {dailyData.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-4">
            날짜별 지출 추이
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(value: number) => [formatAmount(value), "지출"]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #f3f4f6",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-50 rounded-2xl p-4">
          <p className="text-xs text-indigo-500 font-medium mb-1">가장 많은 지출</p>
          {categoryData[0] && (() => {
            const TopIcon = categoryData[0].icon;
            return (
              <>
                <p className="flex items-center gap-1.5 text-lg font-bold text-indigo-700">
                  <TopIcon className="w-4.5 h-4.5" />
                  {categoryData[0].name}
                </p>
                <p className="text-xs text-indigo-500 mt-0.5">
                  {formatAmount(categoryData[0].value)}
                </p>
              </>
            );
          })()}
        </div>
        <div className="bg-amber-50 rounded-2xl p-4">
          <p className="text-xs text-amber-600 font-medium mb-1">
            {viewMode === "personal" ? "개인 지출 최다" : "가장 많이 결제"}
          </p>
          {memberData[0] && (
            <>
              <p className="text-lg font-bold text-amber-700">
                {memberData[0].name}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {formatAmount(memberData[0].paid)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
