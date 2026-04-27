// 그래프 패널 컴포넌트
// Design: Clean charts with category colors and member breakdown

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
import type { TravelProject, ExpenseCategory } from "@/lib/types";
import { CATEGORY_CONFIG, formatAmount, formatDate } from "@/lib/types";

interface Props {
  project: TravelProject;
  selectedDate: string | null;
}

export default function ChartPanel({ project, selectedDate }: Props) {
  const expenses = selectedDate
    ? project.expenses.filter((e) => e.date === selectedDate)
    : project.expenses;

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-gray-500 font-medium mb-1">
          {selectedDate ? "이 날의 지출이 없어요" : "아직 지출이 없어요"}
        </p>
        <p className="text-sm text-gray-400">지출을 추가하면 그래프가 표시됩니다</p>
      </div>
    );
  }

  // 카테고리별 합계
  const categoryData = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_CONFIG[name as ExpenseCategory]?.color || "#6b7280",
      bg: CATEGORY_CONFIG[name as ExpenseCategory]?.bg || "#f3f4f6",
      icon: CATEGORY_CONFIG[name as ExpenseCategory]?.icon || "📌",
    }))
    .sort((a, b) => b.value - a.value);

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  // 멤버별 결제 합계
  const memberData = project.members
    .map((m) => {
      const paid = expenses
        .filter((e) => e.payerId === m.id)
        .reduce((s, e) => s + e.amount, 0);
      return { name: m.name, paid, color: m.color };
    })
    .filter((m) => m.paid > 0)
    .sort((a, b) => b.paid - a.paid);

  // 날짜별 지출 (전체 보기일 때만)
  const dailyData = !selectedDate
    ? Object.entries(
        project.expenses.filter((e) => !Boolean(e.isPreTrip) && e.date).reduce<Record<string, number>>((acc, e) => {
          acc[e.date] = (acc[e.date] || 0) + e.amount;
          return acc;
        }, {})
      )
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: cat.bg }}
                >
                  {cat.icon}
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
            멤버별 결제 금액
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
                  formatter={(value: number) => [formatAmount(value), "결제 금액"]}
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
          {categoryData[0] && (
            <>
              <p className="text-lg font-bold text-indigo-700">
                {categoryData[0].icon} {categoryData[0].name}
              </p>
              <p className="text-xs text-indigo-500 mt-0.5">
                {formatAmount(categoryData[0].value)}
              </p>
            </>
          )}
        </div>
        <div className="bg-amber-50 rounded-2xl p-4">
          <p className="text-xs text-amber-600 font-medium mb-1">가장 많이 결제</p>
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
