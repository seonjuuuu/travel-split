// 지출 추가/수정 모달
// Design: Clean form with category selection and member picker
// 지출 타입: "여행 중" vs "사전 결제" (날짜 없이 독립 분류)

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDragScroll } from "@/hooks/useDragScroll";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import type { Expense, ExpenseCategory, TravelProject } from "@/lib/types";
import { CATEGORY_CONFIG, getDatesInRange, formatDate, formatDayOfWeek } from "@/lib/types";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Plane, User, Users } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  project: TravelProject;
  editExpense?: Expense;
  defaultDate?: string;
  defaultIsPreTrip?: boolean;
  onSaved?: () => void;
}

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as ExpenseCategory[];

export default function AddExpenseModal({
  open,
  onClose,
  project,
  editExpense,
  defaultDate,
  defaultIsPreTrip = false,
  onSaved,
}: Props) {
  const utils = trpc.useUtils();

  const invalidateAndClose = () => {
    utils.projects.get.invalidate({ id: project.id });
    onSaved?.();
    onClose();
  };

  const addExpense = trpc.expenses.add.useMutation({ onSuccess: invalidateAndClose });
  const updateExpense = trpc.expenses.update.useMutation({ onSuccess: invalidateAndClose });
  const travelDates = getDatesInRange(project.startDate, project.endDate);

  const {
    ref: dateScrollRef,
    canScrollLeft: dateCanScrollLeft,
    canScrollRight: dateCanScrollRight,
    scrollLeft: scrollDatesLeft,
    scrollRight: scrollDatesRight,
  } = useDragScroll<HTMLDivElement>();
  const { user } = useAuth();
  // 로그인 계정과 연결된 멤버(진짜 "나") 우선, 없으면 isMe로 표시된 멤버로 폴백
  const myMemberId =
    project.members.find((m) => m.profileId === user?.id)?.id ??
    project.members.find((m) => m.isMe)?.id;

  const [isPreTrip, setIsPreTrip] = useState(defaultIsPreTrip);
  const [isSharedCost, setIsSharedCost] = useState(Boolean(editExpense?.isSharedCost));
  const [isPersonal, setIsPersonal] = useState(Boolean(editExpense?.isPersonal));

  // 공동경비/개인경비는 서로 배타적 - 하나를 켜면 다른 하나는 자동으로 꺼진다
  const toggleSharedCost = () => {
    setIsSharedCost((prev) => {
      const next = !prev;
      if (next) setIsPersonal(false);
      return next;
    });
  };
  const togglePersonal = () => {
    setIsPersonal((prev) => {
      const next = !prev;
      if (next) {
        setIsSharedCost(false);
        // 개인경비는 기본적으로 결제자가 "나"
        if (myMemberId) setForm((f) => ({ ...f, payerId: myMemberId }));
      }
      return next;
    });
  };
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "식비" as ExpenseCategory,
    payerId: project.members[0]?.id || "",
    participantIds: project.members.map((m) => m.id),
    date: defaultDate || project.startDate,
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editExpense) {
      const preTrip = Boolean(editExpense.isPreTrip) === true;
      setIsPreTrip(preTrip);
      setIsSharedCost(Boolean(editExpense.isSharedCost));
      setIsPersonal(Boolean(editExpense.isPersonal));
      setForm({
        title: editExpense.title,
        amount: editExpense.amount.toString(),
        category: editExpense.category,
        payerId: editExpense.payerId,
        participantIds:
          editExpense.participantIds.length > 0
            ? editExpense.participantIds
            : project.members.map((m) => m.id),
        date: editExpense.date || project.startDate,
        note: editExpense.note || "",
      });
    } else {
      setIsPreTrip(defaultIsPreTrip);
      setIsSharedCost(false);
      setIsPersonal(false);
      setForm({
        title: "",
        amount: "",
        category: "식비",
        payerId: project.members[0]?.id || "",
        participantIds: project.members.map((m) => m.id),
        date: defaultDate || project.startDate,
        note: "",
      });
    }
    setErrors({});
  }, [editExpense, open, defaultDate, defaultIsPreTrip, project]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "지출 내용을 입력해주세요";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = "올바른 금액을 입력해주세요";
    if (!isSharedCost && !form.payerId) errs.payerId = "결제자를 선택해주세요";
    if (!isSharedCost && !isPersonal && form.participantIds.length === 0)
      errs.participantIds = "분담 멤버를 1명 이상 선택해주세요";
    if (!isPreTrip && !form.date) errs.date = "날짜를 선택해주세요";
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const expenseData = {
      title: form.title.trim(),
      amount: Math.round(Number(form.amount)),
      category: form.category,
      payerId: form.payerId,
      participantIds: isPersonal ? [form.payerId] : form.participantIds,
      date: isPreTrip ? "" : form.date,
      note: form.note.trim() || undefined,
      isPreTrip: isPreTrip,
      isSharedCost: isSharedCost,
      isPersonal: isPersonal,
    };

    if (editExpense) {
      updateExpense.mutate({ id: editExpense.id, ...expenseData });
    } else {
      addExpense.mutate({ projectId: project.id, ...expenseData });
    }
  };

  const toggleParticipant = (memberId: string) => {
    setForm((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(memberId)
        ? prev.participantIds.filter((id) => id !== memberId)
        : [...prev.participantIds, memberId],
    }));
  };

  const selectAllParticipants = () => {
    setForm((prev) => ({
      ...prev,
      participantIds: project.members.map((m) => m.id),
    }));
  };

  const amountNum = Number(form.amount) || 0;
  const perPerson =
    form.participantIds.length > 0
      ? Math.round(amountNum / form.participantIds.length)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div
          className={`px-6 pt-5 pb-4 sticky top-0 z-10 transition-colors min-w-0 ${
            isPreTrip ? "bg-amber-500" : "bg-indigo-600"
          }`}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              {editExpense ? "지출 수정" : "지출 추가"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 min-w-0">

          {/* 지출 타입 선택 - 여행 중 / 사전 결제 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">지출 구분</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPreTrip(false)}
                className={`flex flex-col items-center gap-1.5 py-3 px-4 rounded-2xl border-2 transition-all ${
                  !isPreTrip
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300"
                }`}
              >
                <CalendarDays className={`w-5 h-5 ${!isPreTrip ? "text-indigo-500" : "text-gray-300"}`} />
                <span className="text-sm font-semibold">여행 중</span>
                <span className="text-[10px] opacity-70">날짜 선택</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPreTrip(true)}
                className={`flex flex-col items-center gap-1.5 py-3 px-4 rounded-2xl border-2 transition-all ${
                  isPreTrip
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300"
                }`}
              >
                <Plane className={`w-5 h-5 ${isPreTrip ? "text-amber-500" : "text-gray-300"}`} />
                <span className="text-sm font-semibold">사전 결제</span>
                <span className="text-[10px] opacity-70">날짜 무관</span>
              </button>
            </div>

            {/* 사전 결제 안내 */}
            {isPreTrip && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-1">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  항공권, 숙소 예약 등 여행 전에 미리 결제한 내역입니다. 날짜와 무관하게 별도로 관리됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 날짜 선택 - 여행 중일 때만 표시 */}
          {!isPreTrip && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">날짜</Label>
              <div className="relative min-w-0">
                {dateCanScrollLeft && (
                  <button
                    type="button"
                    onClick={scrollDatesLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600"
                    aria-label="이전 날짜 보기"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                <div
                  ref={dateScrollRef}
                  className={`flex gap-2 overflow-x-auto pb-1 scrollbar-hide cursor-grab active:cursor-grabbing ${dateCanScrollLeft ? "pl-7" : ""} ${dateCanScrollRight ? "pr-7" : ""}`}
                >
                  {travelDates.map((date, idx) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setForm({ ...form, date })}
                      className={`shrink-0 flex flex-col items-center gap-0.5 w-12 py-2 rounded-xl transition-all ${
                        form.date === date
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-[10px] font-medium opacity-70">
                        {formatDayOfWeek(date)}
                      </span>
                      <span className="text-sm font-bold leading-none">
                        {new Date(date).getDate()}
                      </span>
                      <span className="text-[9px] opacity-60">{idx + 1}일</span>
                    </button>
                  ))}
                </div>
                {dateCanScrollRight && (
                  <button
                    type="button"
                    onClick={scrollDatesRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600"
                    aria-label="다음 날짜 보기"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {form.date && (
                <p className="text-xs text-gray-400">선택: {formatDate(form.date)}</p>
              )}
              {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
            </div>
          )}

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">카테고리</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const isSelected = form.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? "border-current shadow-sm"
                        : "border-transparent hover:border-gray-200"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: cfg.bg,
                            color: cfg.textColor,
                            borderColor: cfg.color,
                          }
                        : { backgroundColor: cfg.bg, color: cfg.textColor }
                    }
                  >
                    <cfg.icon className="w-3.5 h-3.5" />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 지출 내용 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">지출 내용</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isPreTrip ? "항공권, 숙소 예약, 투어 예약 등" : "식사, 택시, 입장료 등"}
              className={`rounded-xl border-gray-200 ${errors.title ? "border-red-400" : ""}`}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* 금액 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">금액 (원)</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                value={form.amount ? Number(form.amount).toLocaleString("ko-KR") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, amount: digits });
                }}
                placeholder="350,000"
                className={`rounded-xl border-gray-200 pr-12 ${errors.amount ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                원
              </span>
            </div>
            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
            {!isPersonal && amountNum > 0 && form.participantIds.length > 0 && (
              <p className={`text-xs font-medium ${isPreTrip ? "text-amber-600" : "text-indigo-600"}`}>
                1인당 {perPerson.toLocaleString()}원
              </p>
            )}
          </div>

          {/* 결제자 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-sm font-medium text-gray-700">결제자</Label>
              <div className="flex items-center gap-1.5">
                {/* 공동경비 토글 */}
                <button
                  type="button"
                  onClick={toggleSharedCost}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 ${
                    isSharedCost
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200"
                  }`}
                >
                  {isSharedCost ? <Check className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  공동경비
                </button>
                {/* 개인경비 토글 */}
                <button
                  type="button"
                  onClick={togglePersonal}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 ${
                    isPersonal
                      ? "bg-violet-500 text-white border-violet-500"
                      : "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200"
                  }`}
                >
                  {isPersonal ? <Check className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  개인경비
                </button>
              </div>
            </div>
            {isSharedCost ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <Users className="w-4.5 h-4.5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700">공동경비로 처리</p>
                  <p className="text-xs text-emerald-600">정산 없이 공동으로 부담한 비용이에요</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setForm({ ...form, payerId: member.id })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                      form.payerId === member.id
                        ? "border-current text-white"
                        : "border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={
                      form.payerId === member.id
                        ? { backgroundColor: member.color, borderColor: member.color }
                        : {}
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        backgroundColor:
                          form.payerId === member.id
                            ? "rgba(255,255,255,0.3)"
                            : member.color,
                      }}
                    >
                      {member.name[0]}
                    </div>
                    {member.name}
                    {member.id === myMemberId && <span className="text-[10px] opacity-70">(나)</span>}
                  </button>
                ))}
              </div>
            )}
            {errors.payerId && <p className="text-xs text-red-500">{errors.payerId}</p>}
          </div>

          {/* 분담 멤버 */}
          {isPersonal ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 rounded-xl border border-violet-200">
              <User className="w-4.5 h-4.5 text-violet-600" />
              <div>
                <p className="text-sm font-semibold text-violet-700">개인 경비로 처리</p>
                <p className="text-xs text-violet-600">정산에 포함되지 않고 결제자 본인의 지출로만 기록돼요</p>
              </div>
            </div>
          ) : !isSharedCost && <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">분담 멤버</Label>
              <button
                type="button"
                onClick={selectAllParticipants}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                전체 선택
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.members.map((member) => {
                const isSelected = form.participantIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                      isSelected
                        ? "border-current text-white"
                        : "border-transparent bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: member.color, borderColor: member.color }
                        : {}
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.3)"
                          : member.color,
                      }}
                    >
                      {member.name[0]}
                    </div>
                    {member.name}
                  </button>
                );
              })}
            </div>
            {errors.participantIds && (
              <p className="text-xs text-red-500">{errors.participantIds}</p>
            )}
          </div>}

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">메모 (선택)</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={isPreTrip ? "왕복 항공권, 조기 예약 할인 등" : "영수증 번호, 특이사항 등"}
              className="rounded-xl border-gray-200"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl border-gray-200 text-gray-600"
            >
              취소
            </Button>
            <Button
              type="submit"
              className={`flex-1 text-white rounded-xl font-medium transition-colors ${
                isPreTrip
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {editExpense ? "수정 완료" : isPreTrip ? "사전 결제 추가" : "지출 추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
