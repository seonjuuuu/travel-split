// 공유 링크 읽기 전용 페이지
// 로그인 없이 shareToken으로 여행 프로젝트를 볼 수 있는 페이지

import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Plane,
  MapPin,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ArrowRight,
  Lock,
  Copy,
  Check,
  PartyPopper,
  StickyNote,
  Wallet,
} from "lucide-react";
import { CATEGORY_CONFIG, formatAmount, formatDate } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function SharedProjectPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"expenses" | "settlement" | "chart">("expenses");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: project, isLoading, error } = trpc.projects.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 정산 계산
  const settlement = useMemo(() => {
    if (!project) return { balances: {}, transfers: [] };
    const members = project.members;
    const expenses = project.expenses;

    const paid: Record<string, number> = {};
    const owed: Record<string, number> = {};
    members.forEach((m) => { paid[m.id] = 0; owed[m.id] = 0; });

    expenses.forEach((expense) => {
      // 공동경비는 정산 계산에서 제외
      if (Boolean(expense.isSharedCost)) return;
      paid[expense.payerId] = (paid[expense.payerId] || 0) + expense.amount;
      const participants =
        expense.participantIds.length > 0
          ? expense.participantIds
          : members.map((m) => m.id);
      const share = expense.amount / participants.length;
      participants.forEach((pid) => {
        owed[pid] = (owed[pid] || 0) + share;
      });
    });

    const balances: Record<string, number> = {};
    members.forEach((m) => {
      balances[m.id] = Math.round((paid[m.id] || 0) - (owed[m.id] || 0));
    });

    // 최소 이체 계산
    const creditors = members
      .filter((m) => balances[m.id] > 0)
      .map((m) => ({ id: m.id, name: m.name, color: m.color, amount: balances[m.id] }))
      .sort((a, b) => b.amount - a.amount);
    const debtors = members
      .filter((m) => balances[m.id] < 0)
      .map((m) => ({ id: m.id, name: m.name, color: m.color, amount: -balances[m.id] }))
      .sort((a, b) => b.amount - a.amount);

    const transfers: { from: string; fromColor: string; to: string; toColor: string; amount: number }[] = [];
    const cred = creditors.map((c) => ({ ...c }));
    const debt = debtors.map((d) => ({ ...d }));

    let ci = 0, di = 0;
    while (ci < cred.length && di < debt.length) {
      const transfer = Math.min(cred[ci].amount, debt[di].amount);
      if (transfer > 0) {
        transfers.push({
          from: debt[di].name,
          fromColor: debt[di].color,
          to: cred[ci].name,
          toColor: cred[ci].color,
          amount: Math.round(transfer),
        });
      }
      cred[ci].amount -= transfer;
      debt[di].amount -= transfer;
      if (cred[ci].amount <= 0) ci++;
      if (debt[di].amount <= 0) di++;
    }

    return { balances, transfers };
  }, [project]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">여행 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!project || error) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">링크를 찾을 수 없어요</h2>
          <p className="text-gray-500 mb-6 text-sm">
            공유 링크가 만료되었거나 존재하지 않는 여행입니다.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = project.expenses.reduce((s, e) => s + e.amount, 0);
  const preTripExpenses = project.expenses.filter((e) => e.isPreTrip);
  const tripExpenses = project.expenses.filter((e) => !e.isPreTrip);

  // 카테고리별 합계 (그래프용)
  const categoryData = Object.entries(
    project.expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_CONFIG[name as keyof typeof CATEGORY_CONFIG]?.color || "#6366f1",
    }))
    .sort((a, b) => b.value - a.value);

  // 멤버별 지출 합계 (그래프용)
  const memberData = project.members.map((m) => ({
    name: m.name,
    color: m.color,
    paid: project.expenses
      .filter((e) => e.payerId === m.id)
      .reduce((s, e) => s + e.amount, 0),
  }));

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Plane className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">트립스플릿</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">읽기 전용</span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "복사됨!" : "링크 복사"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* 여행 정보 카드 */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-200" />
            <span className="text-indigo-200 text-xs font-medium">{project.destination}</span>
          </div>
          <h1 className="text-xl font-bold mb-3">{project.name}</h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-200" />
              <span className="text-indigo-100">
                {new Date(project.startDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                {" ~ "}
                {new Date(project.endDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-200" />
              <span className="text-indigo-100">{project.members.length}명</span>
            </div>
          </div>

          {/* 멤버 아바타 */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-indigo-500">
            <div className="flex -space-x-1.5">
              {project.members.map((m) => (
                <div
                  key={m.id}
                  className="w-7 h-7 rounded-full border-2 border-indigo-600 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: m.color }}
                  title={m.name}
                >
                  {m.name[0]}
                </div>
              ))}
            </div>
            <span className="text-indigo-200 text-xs">
              {project.members.map((m) => m.name).join(", ")}
            </span>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">총 지출</p>
            <p className="font-bold text-gray-900 text-sm">{formatAmount(totalAmount)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">지출 건수</p>
            <p className="font-bold text-gray-900 text-sm">{project.expenses.length}건</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">1인 평균</p>
            <p className="font-bold text-gray-900 text-sm">
              {project.members.length > 0
                ? formatAmount(Math.round(totalAmount / project.members.length))
                : "0원"}
            </p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1 gap-1">
          {[
            { key: "expenses", label: "지출 내역" },
            { key: "settlement", label: "정산" },
            { key: "chart", label: "그래프" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 지출 내역 탭 */}
        {activeTab === "expenses" && (
          <div className="space-y-4">
            {/* 사전 결제 */}
            {preTripExpenses.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">
                    <Plane className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">사전 결제</span>
                    <span className="text-xs bg-amber-200 text-amber-800 rounded-full px-1.5 font-bold">{preTripExpenses.length}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 ml-auto">
                    {formatAmount(preTripExpenses.reduce((s, e) => s + e.amount, 0))}
                  </span>
                </div>
                <div className="space-y-2">
                  {preTripExpenses.map((expense) => renderExpenseCard(expense, project, expandedId, setExpandedId))}
                </div>
              </div>
            )}

            {/* 여행 중 지출 */}
            {tripExpenses.length > 0 && (
              <div className="space-y-2">
                {tripExpenses.map((expense) => renderExpenseCard(expense, project, expandedId, setExpandedId))}
              </div>
            )}

            {project.expenses.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">아직 지출 내역이 없어요</p>
              </div>
            )}
          </div>
        )}

        {/* 정산 탭 */}
        {activeTab === "settlement" && (
          <div className="space-y-4">
            {/* 멤버별 잔액 */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="font-semibold text-gray-900 text-sm">멤버별 정산 현황</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {project.members.map((m) => {
                  const balance = settlement.balances[m.id] || 0;
                  const paid = project.expenses
                    .filter((e) => e.payerId === m.id)
                    .reduce((s, e) => s + e.amount, 0);
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: m.color }}>{m.name}</p>
                        <p className="text-xs text-gray-400">결제 {formatAmount(paid)}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold text-sm ${
                            balance > 0 ? "text-emerald-600" : balance < 0 ? "text-red-500" : "text-gray-400"
                          }`}
                        >
                          {balance > 0 ? `+${formatAmount(balance)}` : balance < 0 ? `-${formatAmount(-balance)}` : "정산 완료"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {balance > 0 ? "받을 금액" : balance < 0 ? "보낼 금액" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 이체 목록 */}
            {settlement.transfers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm">정산 방법</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {settlement.transfers.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: t.fromColor }}
                      >
                        {t.from[0]}
                      </div>
                      <span className="font-medium text-sm" style={{ color: t.fromColor }}>{t.from}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: t.toColor }}
                      >
                        {t.to[0]}
                      </div>
                      <span className="font-medium text-sm" style={{ color: t.toColor }}>{t.to}</span>
                      <span className="ml-auto font-bold text-indigo-600 text-sm">{formatAmount(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settlement.transfers.length === 0 && (
              <div className="bg-emerald-50 rounded-2xl p-5 text-center">
                <p className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold text-sm">
                  <PartyPopper className="w-4 h-4" />
                  모두 정산 완료!
                </p>
                <p className="text-emerald-600 text-xs mt-1">추가 이체가 필요 없어요</p>
              </div>
            )}
          </div>
        )}

        {/* 그래프 탭 */}
        {activeTab === "chart" && (
          <div className="space-y-4">
            {categoryData.length > 0 ? (
              <>
                {/* 카테고리별 파이차트 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">카테고리별 지출</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatAmount(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {categoryData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                          <span className="text-xs font-semibold text-gray-900">{formatAmount(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 멤버별 바차트 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">멤버별 결제 금액</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={memberData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 10000)}만`} />
                      <Tooltip formatter={(v: number) => formatAmount(v)} />
                      <Bar dataKey="paid" radius={[4, 4, 0, 0]}>
                        {memberData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">지출을 추가하면 그래프가 표시됩니다</p>
              </div>
            )}
          </div>
        )}

        {/* 하단 안내 */}
        <div className="bg-indigo-50 rounded-2xl p-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-indigo-700">읽기 전용 공유 페이지</p>
            <p className="text-xs text-indigo-500 mt-0.5">
              이 페이지는 여행 주최자가 공유한 링크입니다. 지출 추가/수정은 불가합니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// 지출 카드 렌더링 함수
function renderExpenseCard(
  expense: {
    id: string;
    title: string;
    amount: number;
    category: string;
    payerId: string;
    participantIds: string[];
    date: string;
    isPreTrip: boolean;
    isSharedCost?: boolean | number | null;
    note?: string | null;
  },
  project: { members: { id: string; name: string; color: string }[] },
  expandedId: string | null,
  setExpandedId: (id: string | null) => void
) {
  const catConfig = CATEGORY_CONFIG[expense.category as keyof typeof CATEGORY_CONFIG];
  const isSharedCostCard = Boolean(expense.isSharedCost);
  const payer = project.members.find((m) => m.id === expense.payerId);
  const participants =
    expense.participantIds.length > 0
      ? expense.participantIds.map((id) => project.members.find((m) => m.id === id)).filter(Boolean)
      : project.members;
  const isExpanded = expandedId === expense.id;

  return (
    <div
      key={expense.id}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpandedId(isExpanded ? null : expense.id)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: catConfig?.bg || "#f3f4f6" }}
        >
          {(() => {
            const Icon = catConfig?.icon || Wallet;
            return <Icon className="w-4.5 h-4.5" style={{ color: catConfig?.textColor }} />;
          })()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ backgroundColor: catConfig?.bg, color: catConfig?.textColor }}
            >
              {expense.category}
            </span>
            <span className="font-semibold text-gray-900 text-sm truncate">{expense.title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1.5">
            {isSharedCostCard ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">
                공동경비
              </span>
            ) : payer ? (
              <div className="flex items-center gap-1">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: payer.color }}
                >
                  {payer.name[0]}
                </div>
                <span className="font-medium" style={{ color: payer.color }}>{payer.name}</span>
                <span className="text-gray-400">결제</span>
              </div>
            ) : null}
            {expense.date && (
              <>
                <span className="text-gray-200">·</span>
                <span>{formatDate(expense.date)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-gray-900 text-sm">{formatAmount(expense.amount)}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          <p className="text-xs text-gray-400 mb-2">분담 멤버</p>
          <div className="flex flex-wrap gap-1.5">
            {participants.map((m) =>
              m ? (
                <div
                  key={m.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: m.color + "20", color: m.color }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.name[0]}
                  </div>
                  {m.name}
                  <span className="text-gray-400 ml-0.5">
                    ({formatAmount(Math.round(expense.amount / participants.length))})
                  </span>
                </div>
              ) : null
            )}
          </div>
          {expense.note && (
            <p className="flex items-start gap-1.5 text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2">
              <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
              {expense.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
