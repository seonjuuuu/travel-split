// 지출 추가/수정 모달
// Design: Clean form with category selection and member picker

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import type { Expense, ExpenseCategory, TravelProject } from "@/lib/types";
import { CATEGORY_CONFIG, getDatesInRange, formatDate, formatDayOfWeek } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  project: TravelProject;
  editExpense?: Expense;
  defaultDate?: string;
}

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as ExpenseCategory[];

export default function AddExpenseModal({
  open,
  onClose,
  project,
  editExpense,
  defaultDate,
}: Props) {
  const { addExpense, updateExpense } = useApp();
  const travelDates = getDatesInRange(project.startDate, project.endDate);

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
      setForm({
        title: editExpense.title,
        amount: editExpense.amount.toString(),
        category: editExpense.category,
        payerId: editExpense.payerId,
        participantIds: editExpense.participantIds.length > 0
          ? editExpense.participantIds
          : project.members.map((m) => m.id),
        date: editExpense.date,
        note: editExpense.note || "",
      });
    } else {
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
  }, [editExpense, open, defaultDate, project]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "지출 내용을 입력해주세요";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = "올바른 금액을 입력해주세요";
    if (!form.payerId) errs.payerId = "결제자를 선택해주세요";
    if (form.participantIds.length === 0)
      errs.participantIds = "분담 멤버를 1명 이상 선택해주세요";
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
      participantIds: form.participantIds,
      date: form.date,
      note: form.note.trim() || undefined,
    };

    if (editExpense) {
      updateExpense(project.id, editExpense.id, expenseData);
    } else {
      addExpense(project.id, expenseData);
    }
    onClose();
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
        <div className="bg-indigo-600 px-6 pt-5 pb-4 sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              {editExpense ? "지출 수정" : "지출 추가"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* 날짜 선택 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">날짜</Label>
            <div className="flex gap-2 overflow-x-auto pb-1">
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
            <p className="text-xs text-gray-400">
              선택: {formatDate(form.date)}
            </p>
          </div>

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
                    <span>{cfg.icon}</span>
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
              placeholder="스시 오마카세"
              className={`rounded-xl border-gray-200 ${errors.title ? "border-red-400" : ""}`}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* 금액 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">금액 (원)</Label>
            <div className="relative">
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="50000"
                className={`rounded-xl border-gray-200 pr-12 ${errors.amount ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                원
              </span>
            </div>
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount}</p>
            )}
            {amountNum > 0 && form.participantIds.length > 0 && (
              <p className="text-xs text-indigo-600 font-medium">
                1인당 {perPerson.toLocaleString()}원
              </p>
            )}
          </div>

          {/* 결제자 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">결제자</Label>
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
                    style={{ backgroundColor: form.payerId === member.id ? "rgba(255,255,255,0.3)" : member.color }}
                  >
                    {member.name[0]}
                  </div>
                  {member.name}
                  {member.isMe && (
                    <span className="text-[10px] opacity-70">(나)</span>
                  )}
                </button>
              ))}
            </div>
            {errors.payerId && (
              <p className="text-xs text-red-500">{errors.payerId}</p>
            )}
          </div>

          {/* 분담 멤버 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">
                분담 멤버
              </Label>
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
                      style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : member.color }}
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
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              메모 (선택)
            </Label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="간단한 메모를 남겨보세요"
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
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
            >
              {editExpense ? "수정 완료" : "지출 추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
