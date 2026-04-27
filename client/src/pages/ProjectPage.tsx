// 여행 프로젝트 상세 페이지
// Design: Scandinavian Minimal + Travel Scrapbook
// Tabs: 지출목록 / 그래프 / 정산
// Date: 동그란 날짜 버튼 타임라인 + 달력 뷰 전환 가능

import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Users,
  BarChart3,
  Receipt,
  Calculator,
  Settings,
  MapPin,
  CalendarDays,
  Grid3X3,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { getDatesInRange, formatDate, formatDayOfWeek, formatAmount } from "@/lib/types";
import ExpenseList from "@/components/ExpenseList";
import AddExpenseModal from "@/components/AddExpenseModal";
import MembersPanel from "@/components/MembersPanel";
import SettlementPanel from "@/components/SettlementPanel";
import ChartPanel from "@/components/ChartPanel";
import ProjectSettingsModal from "@/components/ProjectSettingsModal";
import CalendarView from "@/components/CalendarView";

type Tab = "expenses" | "chart" | "settlement";
type DateViewMode = "pills" | "calendar";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { projects, selectProject } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dateViewMode, setDateViewMode] = useState<DateViewMode>("pills");

  const project = projects.find((p) => p.id === params.id);

  useEffect(() => {
    if (params.id) {
      selectProject(params.id);
    }
  }, [params.id, selectProject]);

  if (!project) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">프로젝트를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const travelDates = getDatesInRange(project.startDate, project.endDate);
  const preTripExpenses = project.expenses.filter((e) => e.date < project.startDate);
  const filteredExpenses = selectedDate === "pre-trip"
    ? preTripExpenses
    : selectedDate
    ? project.expenses.filter((e) => e.date === selectedDate)
    : project.expenses;

  const totalExpense = project.expenses.reduce((s, e) => s + e.amount, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "expenses", label: "지출 목록", icon: <Receipt className="w-4 h-4" /> },
    { id: "chart", label: "그래프", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "settlement", label: "정산", icon: <Calculator className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-xs text-indigo-600 font-medium truncate">
                {project.destination}
              </span>
            </div>
            <h1 className="font-bold text-gray-900 text-base leading-tight truncate">
              {project.name}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1 px-3 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-600"
            >
              <Users className="w-3.5 h-3.5" />
              {project.members.length}명
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      {/* 날짜 선택 영역 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          {/* 뷰 모드 전환 버튼 */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-400">
              {selectedDate ? `📅 ${formatDate(selectedDate)} 선택됨` : "전체 날짜"}
            </p>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setDateViewMode("pills")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  dateViewMode === "pills"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Grid3X3 className="w-3 h-3" />
                버튼
              </button>
              <button
                onClick={() => setDateViewMode("calendar")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  dateViewMode === "calendar"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <CalendarDays className="w-3 h-3" />
                달력
              </button>
            </div>
          </div>

          {/* 날짜 버튼 모드 */}
          {dateViewMode === "pills" && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {/* 전체 버튼 */}
              <button
                onClick={() => setSelectedDate(null)}
                className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all ${
                  selectedDate === null
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <span className="text-xs font-bold">전체</span>
                <span className="text-[10px] opacity-70">
                  {project.expenses.length}건
                </span>
              </button>

              {/* 사전 결제 버튼 */}
              {preTripExpenses.length > 0 && (
                <button
                  onClick={() => setSelectedDate("pre-trip")}
                  className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all ${
                    selectedDate === "pre-trip"
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-bold">사전</span>
                  <span className="text-[10px] opacity-70">
                    {preTripExpenses.length}건
                  </span>
                </button>
              )}

              {/* 날짜별 버튼 */}
              {travelDates.map((date, idx) => {
                const dayExpenses = project.expenses.filter(
                  (e) => e.date === date
                );
                const isSelected = selectedDate === date;
                const isToday = date === new Date().toISOString().split("T")[0];

                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(isSelected ? null : date)}
                    className={`shrink-0 flex flex-col items-center gap-0.5 w-14 py-2 rounded-2xl transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                        : isToday
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    <span className="text-[10px] font-medium opacity-70">
                      {formatDayOfWeek(date)}
                    </span>
                    <span className="text-sm font-bold leading-none">
                      {new Date(date).getDate()}
                    </span>
                    <span className="text-[10px] opacity-60">{idx + 1}일차</span>
                    {dayExpenses.length > 0 && (
                      <div
                        className={`w-1 h-1 rounded-full mt-0.5 ${
                          isSelected ? "bg-white" : "bg-indigo-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 달력 모드 */}
          {dateViewMode === "calendar" && (
            <CalendarView
              project={project}
              selectedDate={selectedDate}
              onSelectDate={(date: string) => setSelectedDate(date === selectedDate ? null : date)}
            />
          )}
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">총 지출</p>
            <p className="text-lg font-bold text-gray-900 font-numeric">
              {totalExpense.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-0.5">원</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">지출 건수</p>
            <p className="text-lg font-bold text-gray-900">
              {project.expenses.length}
              <span className="text-xs font-normal text-gray-400 ml-0.5">건</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">인당 평균</p>
            <p className="text-lg font-bold text-gray-900 font-numeric">
              {project.members.length > 0
                ? Math.round(totalExpense / project.members.length).toLocaleString()
                : 0}
              <span className="text-xs font-normal text-gray-400 ml-0.5">원</span>
            </p>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "expenses" && (
              <ExpenseList
                project={project}
                expenses={filteredExpenses}
                selectedDate={selectedDate}
              />
            )}
            {activeTab === "chart" && (
              <ChartPanel project={project} selectedDate={selectedDate} />
            )}
            {activeTab === "settlement" && (
              <SettlementPanel project={project} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FAB - 지출 추가 */}
      {activeTab === "expenses" && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddExpense(true)}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center transition-colors"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      )}

      {/* 모달들 */}
      <AddExpenseModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        project={project}
        defaultDate={selectedDate || project.startDate}
      />
      <MembersPanel
        open={showMembers}
        onClose={() => setShowMembers(false)}
        project={project}
      />
      <ProjectSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        project={project}
      />
    </div>
  );
}
