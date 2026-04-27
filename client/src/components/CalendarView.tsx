// 달력 뷰 컴포넌트
// Design: Clean calendar with expense indicators

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TravelProject } from "@/lib/types";
import { formatAmount } from "@/lib/types";

interface Props {
  project: TravelProject;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarView({ project, selectedDate, onSelectDate }: Props) {
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);

  const [viewMonth, setViewMonth] = useState(() => {
    return new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  // 날짜별 지출 합계 맵
  const expenseByDate = project.expenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.date] = (acc[e.date] || 0) + e.amount;
      return acc;
    },
    {}
  );

  const isInTravelRange = (dateStr: string) => {
    return dateStr >= project.startDate && dateStr <= project.endDate;
  };

  const formatDateStr = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <button
          onClick={prevMonth}
          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm font-bold text-gray-900">
          {year}년 {month + 1}월
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 px-2 pt-2">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              idx === 0 ? "text-red-400" : idx === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 px-2 pb-3 gap-y-1">
        {/* 빈 칸 */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* 날짜 */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDateStr(year, month, day);
          const inRange = isInTravelRange(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === today;
          const dayExpenseTotal = expenseByDate[dateStr] || 0;
          const hasExpense = dayExpenseTotal > 0;
          const dayOfWeek = new Date(year, month, day).getDay();

          return (
            <button
              key={day}
              onClick={() => inRange && onSelectDate(dateStr)}
              disabled={!inRange}
              className={`
                relative flex flex-col items-center justify-start py-1.5 rounded-xl transition-all min-h-[52px]
                ${!inRange ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected ? "bg-indigo-600 text-white shadow-sm" : ""}
                ${!isSelected && inRange ? "hover:bg-indigo-50" : ""}
                ${isToday && !isSelected ? "ring-2 ring-indigo-300 ring-offset-1" : ""}
              `}
            >
              <span
                className={`text-xs font-bold leading-none ${
                  isSelected
                    ? "text-white"
                    : dayOfWeek === 0
                    ? "text-red-400"
                    : dayOfWeek === 6
                    ? "text-blue-400"
                    : inRange
                    ? "text-gray-800"
                    : "text-gray-300"
                }`}
              >
                {day}
              </span>
              {hasExpense && (
                <span
                  className={`text-[9px] font-medium mt-0.5 leading-none ${
                    isSelected ? "text-indigo-200" : "text-indigo-500"
                  }`}
                >
                  {dayExpenseTotal >= 10000
                    ? `${Math.round(dayExpenseTotal / 10000)}만`
                    : `${dayExpenseTotal.toLocaleString()}`}
                </span>
              )}
              {hasExpense && !isSelected && (
                <div className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* 여행 날짜 범위 표시 */}
      <div className="px-4 pb-3 flex items-center gap-2 text-xs text-gray-400">
        <div className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300" />
        <span>
          여행 기간: {project.startDate.replace(/-/g, ".")} ~{" "}
          {project.endDate.replace(/-/g, ".")}
        </span>
      </div>
    </div>
  );
}
