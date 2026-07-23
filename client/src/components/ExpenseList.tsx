// 지출 목록 컴포넌트
// Design: Card-based expense list with category color accents
// 사전 결제(isPreTrip=true)는 날짜 무관 별도 섹션으로 표시

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Edit2, ChevronDown, ChevronUp, Clock, Plane, Receipt, StickyNote, User, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Expense, TravelProject } from "@/lib/types";
import { CATEGORY_CONFIG, formatAmount, formatDate } from "@/lib/types";
import AddExpenseModal from "@/components/AddExpenseModal";

interface Props {
  project: TravelProject;
  expenses: Expense[];
  selectedDate: string | null;
  selectedMemberId?: string | null;
  onRefresh?: () => void;
}

export default function ExpenseList({ project, expenses, selectedDate, selectedMemberId, onRefresh }: Props) {
  const utils = trpc.useUtils();
  const deleteExpenseMutation = trpc.expenses.delete.useMutation({
    onMutate: async (vars) => {
      await utils.projects.get.cancel({ id: project.id });
      const prev = utils.projects.get.getData({ id: project.id });
      utils.projects.get.setData({ id: project.id }, (old) => {
        if (!old) return old;
        return { ...old, expenses: old.expenses.filter((e) => e.id !== vars.id) };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.projects.get.setData({ id: project.id }, ctx.prev);
    },
    onSettled: () => {
      utils.projects.get.invalidate({ id: project.id });
      onRefresh?.();
    },
  });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPreTrip, setShowPreTrip] = useState(true);
  const [showPersonal, setShowPersonal] = useState(true);

  const handleDelete = (expenseId: string) => {
    if (deleteConfirm === expenseId) {
      deleteExpenseMutation.mutate({ id: expenseId });
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(expenseId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // 개인경비는 사전결제 여부와 무관하게 항상 별도 섹션으로 분리
  const personalExpenses = expenses.filter((e) => Boolean(e.isPersonal) === true);
  // isPreTrip 플래그로 분리 (날짜 무관, 개인경비는 제외)
  const preTripExpenses = expenses.filter(
    (e) => Boolean(e.isPreTrip) === true && Boolean(e.isPersonal) !== true
  );
  const tripExpenses = expenses.filter(
    (e) => Boolean(e.isPreTrip) !== true && Boolean(e.isPersonal) !== true
  );

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Receipt className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium mb-1">
          {selectedMemberId
            ? `${project.members.find((m) => m.id === selectedMemberId)?.name ?? "이 멤버"}의 지출이 없어요`
            : selectedDate
            ? "이 날의 지출이 없어요"
            : "아직 지출이 없어요"}
        </p>
        <p className="text-sm text-gray-400">
          {selectedMemberId
            ? "다른 멤버를 선택하거나 전체를 눌러보세요"
            : "+ 버튼을 눌러 지출을 추가해보세요"}
        </p>
      </div>
    );
  }

  // 여행 중 지출: 날짜별 그룹핑
  const grouped = tripExpenses.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.date || "날짜 없음";
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  const renderExpenseRow = (expense: Expense, idx: number) => {
    const catConfig = CATEGORY_CONFIG[expense.category];
    const payer = project.members.find((m) => m.id === expense.payerId);
    const isExpanded = expandedId === expense.id;
    const isSharedCostCard = Boolean(expense.isSharedCost) === true;
    const isPersonalCard = Boolean(expense.isPersonal) === true;
    const participants =
      expense.participantIds.length > 0
        ? expense.participantIds
            .map((id) => project.members.find((m) => m.id === id))
            .filter(Boolean)
        : project.members;

    return (
      <motion.div
        key={expense.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: idx * 0.03 }}
      >
        <div
          className="grid grid-cols-[1fr_auto] cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : expense.id)}
        >
          {/* 메인: 아이콘 + 내용 */}
          <div className="flex items-center gap-3 p-4 min-w-0">
            {/* 카테고리 아이콘 */}
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
              style={{ backgroundColor: catConfig.bg }}
            >
              <catConfig.icon className="w-4.5 h-4.5" style={{ color: catConfig.textColor }} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {expense.title}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 flex-wrap">
                <span
                  className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: catConfig.bg,
                    color: catConfig.textColor,
                  }}
                >
                  {expense.category}
                </span>
                {isSharedCostCard ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <Users className="w-3 h-3" />
                    공동경비
                  </span>
                ) : payer ? (
                  <div className="flex items-center gap-1">
                    <span className="font-medium" style={{ color: payer.color }}>{payer.name}</span>
                    <span className="text-gray-400">결제</span>
                  </div>
                ) : null}
                {!isSharedCostCard && !isPersonalCard && (
                  <><span className="text-gray-200">·</span>
                  <span>{participants.length}명 분담</span></>
                )}
              </div>
            </div>
          </div>

          {/* 금액 스텁 */}
          <div className="flex flex-col items-end justify-center gap-1 px-4 min-w-[92px]">
            <span className="tix-mono font-bold text-gray-900 text-sm whitespace-nowrap">
              {formatAmount(expense.amount)}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )}
          </div>
        </div>

        {/* 확장 영역 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                {/* 참여자 */}
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-2">분담 멤버</p>
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map((m) =>
                      m ? (
                        <div
                          key={m.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: m.color + "20",
                            color: m.color,
                          }}
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
                </div>

                {expense.note && (
                  <p className="flex items-start gap-1.5 text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                    <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                    {expense.note}
                  </p>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingExpense(expense)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      deleteConfirm === expense.id
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500"
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    {deleteConfirm === expense.id ? "확인" : "삭제"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // 지출 여러 건을 하나의 티켓 안에 절취선(펀치 구멍 포함)으로 구분해 담고, 오른쪽엔 세로 절취 스텁으로 마무리
  // overflow-hidden을 주면 절취선/스텁의 펀치 구멍이 카드 테두리에 잘려서 안 보이므로 절대 넣지 않는다.
  const renderExpenseTicket = (list: Expense[]) => {
    const stubCode = `${project.destination.slice(0, 3).toUpperCase()} · ${String(list.length).padStart(2, "0")}`;
    return (
      <div className="bg-white rounded-sm border border-gray-100 shadow-sm flex">
        <div className="flex-1 min-w-0">
          <AnimatePresence>
            {list.map((expense, idx) => (
              <div key={expense.id}>
                {renderExpenseRow(expense, idx)}
                {idx < list.length - 1 && (
                  <div className="tix-perf" style={{ ["--tix-hole-bg" as string]: "#E4E6DF" }} />
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
        <div className="tix-stub" style={{ ["--tix-hole-bg" as string]: "#E4E6DF" }}>
          <span className="tix-stub-code tix-mono">{stubCode}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* ✈️ 사전 결제 섹션 - 날짜 무관 독립 분류 */}
        {preTripExpenses.length > 0 && (
          <div>
            <button
              onClick={() => setShowPreTrip((v) => !v)}
              className="flex items-center justify-between w-full mb-3 group"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">
                  <Plane className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">사전 결제</span>
                  <span className="text-xs bg-amber-200 text-amber-800 rounded-full px-1.5 py-0.5 font-bold ml-0.5">
                    {preTripExpenses.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tix-mono text-xs font-bold text-amber-600">
                  {formatAmount(preTripExpenses.reduce((s, e) => s + e.amount, 0))}
                </span>
                {showPreTrip ? (
                  <ChevronUp className="w-4 h-4 text-amber-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {showPreTrip && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {renderExpenseTicket(preTripExpenses)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 👤 개인경비 섹션 - 정산 제외, 결제자 본인 지출로만 관리 */}
        {personalExpenses.length > 0 && (
          <div>
            <button
              onClick={() => setShowPersonal((v) => !v)}
              className="flex items-center justify-between w-full mb-3 group"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">개인 경비</span>
                  <span className="text-xs bg-violet-200 text-violet-800 rounded-full px-1.5 py-0.5 font-bold ml-0.5">
                    {personalExpenses.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tix-mono text-xs font-bold text-violet-600">
                  {formatAmount(personalExpenses.reduce((s, e) => s + e.amount, 0))}
                </span>
                {showPersonal ? (
                  <ChevronUp className="w-4 h-4 text-violet-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-violet-400" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {showPersonal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {renderExpenseTicket(personalExpenses)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 📅 여행 중 지출 - 날짜별 그룹 */}
        {sortedDates.map((date) => {
          const dayExpenses = grouped[date];
          const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

          return (
            <div key={date}>
              {/* 날짜 헤더 */}
              {!selectedDate && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                    <span className="text-sm font-semibold text-gray-700">
                      {date !== "날짜 없음" ? formatDate(date) : "날짜 미지정"}
                    </span>
                  </div>
                  <span className="tix-mono text-xs font-medium text-gray-400">
                    {formatAmount(dayTotal)}
                  </span>
                </div>
              )}

              {renderExpenseTicket(dayExpenses)}
            </div>
          );
        })}

        {/* 여행 중 지출이 없고 사전 결제/개인경비만 있는 경우 */}
        {tripExpenses.length === 0 &&
          (preTripExpenses.length > 0 || personalExpenses.length > 0) && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-400">여행 중 지출이 없어요</p>
            <p className="text-xs text-gray-300 mt-1">
              + 버튼을 눌러 여행 중 지출을 추가해보세요
            </p>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {editingExpense && (
        <AddExpenseModal
          open={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          project={project}
          editExpense={editingExpense}
          defaultIsPreTrip={Boolean(editingExpense.isPreTrip) === true}
          onSaved={() => {
            utils.projects.get.invalidate({ id: project.id });
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
