// 여행 프로젝트 상세 페이지 - tRPC 기반
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Users, BarChart3, Receipt, Calculator,
  Settings, MapPin, CalendarDays, Grid3X3, Plane,
  Share2, Copy, Check, X, Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getDatesInRange, formatDate, formatDayOfWeek } from "@/lib/types";
import ExpenseList from "@/components/ExpenseList";
import AddExpenseModal from "@/components/AddExpenseModal";
import MembersPanel from "@/components/MembersPanel";
import SettlementPanel from "@/components/SettlementPanel";
import ChartPanel from "@/components/ChartPanel";
import ProjectSettingsModal from "@/components/ProjectSettingsModal";
import CalendarView from "@/components/CalendarView";
import { toast } from "sonner";

type Tab = "expenses" | "chart" | "settlement";
type DateViewMode = "pills" | "calendar";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dateViewMode, setDateViewMode] = useState<DateViewMode>("pills");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: project, isLoading, refetch } = trpc.projects.get.useQuery(
    { id: params.id ?? "" },
    { enabled: !!params.id }
  );

  const utils = trpc.useUtils();

  const enableShareMutation = trpc.projects.enableShare.useMutation({
    onSuccess: (data) => {
      setShareToken(data.token);
      setShowShareModal(true);
      utils.projects.get.invalidate({ id: params.id ?? "" });
    },
    onError: () => toast.error("공유 링크 생성에 실패했습니다."),
  });

  const disableShareMutation = trpc.projects.disableShare.useMutation({
    onSuccess: () => {
      setShareToken(null);
      setShowShareModal(false);
      toast.success("공유 링크가 비활성화되었습니다.");
      utils.projects.get.invalidate({ id: params.id ?? "" });
    },
    onError: () => toast.error("공유 링크 비활성화에 실패했습니다."),
  });

  const handleShare = () => {
    if (!project) return;
    if (project.shareToken) {
      setShareToken(project.shareToken);
      setShowShareModal(true);
    } else {
      enableShareMutation.mutate({ id: project.id });
    }
  };

  const handleCopyShareLink = () => {
    const token = shareToken || project?.shareToken;
    if (!token) return;
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
    toast.success("링크가 복사되었습니다!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">프로젝트를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/")} variant="outline">홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const travelDates = getDatesInRange(project.startDate, project.endDate);
  const preTripExpenses = project.expenses.filter((e) => e.isPreTrip === true);
  const tripExpenses = project.expenses.filter((e) => e.isPreTrip !== true);
  // 날짜 필터 적용
  const dateFilteredExpenses = selectedDate === "pre-trip"
    ? preTripExpenses
    : selectedDate
    ? tripExpenses.filter((e) => e.date === selectedDate)
    : project.expenses;

  // 멤버 필터 추가 적용 (결제자이거나 참여자인 경우)
  const filteredExpenses = selectedMemberId
    ? dateFilteredExpenses.filter(
        (e) =>
          e.payerId === selectedMemberId ||
          (Array.isArray(e.participantIds) && e.participantIds.includes(selectedMemberId))
      )
    : dateFilteredExpenses;

  // 선택된 멤버의 총 지출 (결제 기준)
  const selectedMemberTotal = selectedMemberId
    ? project.expenses
        .filter((e) => e.payerId === selectedMemberId)
        .reduce((s, e) => s + e.amount, 0)
    : null;
  const totalExpense = project.expenses.reduce((s, e) => s + e.amount, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "expenses", label: "지출 목록", icon: <Receipt className="w-4 h-4" /> },
    { id: "chart", label: "그래프", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "settlement", label: "정산", icon: <Calculator className="w-4 h-4" /> },
  ];

  const currentShareToken = shareToken || project.shareToken;
  const shareUrl = currentShareToken ? `${window.location.origin}/share/${currentShareToken}` : "";

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-xs text-indigo-600 font-medium truncate">{project.destination}</span>
            </div>
            <h1 className="font-bold text-gray-900 text-base leading-tight truncate">{project.name}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowMembers(true)} className="flex items-center gap-1 px-3 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-600">
              <Users className="w-3.5 h-3.5" />{project.members.length}명
            </button>
            {/* 공유 버튼 */}
            <button
              onClick={handleShare}
              disabled={enableShareMutation.isPending}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${project.shareToken ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200" : "hover:bg-gray-100 text-gray-500"}`}
              title="친구에게 공유"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-400">
              {selectedDate === "pre-trip" ? "✈️ 사전 결제 내역" : selectedDate ? `📅 ${formatDate(selectedDate)} 선택됨` : "전체 날짜"}
            </p>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setDateViewMode("pills")} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${dateViewMode === "pills" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                <Grid3X3 className="w-3 h-3" />버튼
              </button>
              <button onClick={() => setDateViewMode("calendar")} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${dateViewMode === "calendar" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                <CalendarDays className="w-3 h-3" />달력
              </button>
            </div>
          </div>
          {dateViewMode === "pills" && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => setSelectedDate(null)} className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all ${selectedDate === null ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                <span className="text-xs font-bold">전체</span>
                <span className="text-[10px] opacity-70">{project.expenses.length}건</span>
              </button>
              <button onClick={() => setSelectedDate(selectedDate === "pre-trip" ? null : "pre-trip")} className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all ${selectedDate === "pre-trip" ? "bg-amber-500 text-white shadow-sm" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>
                <Plane className="w-3 h-3" />
                <span className="text-xs font-bold">사전</span>
                <span className="text-[10px] opacity-70">{preTripExpenses.length}건</span>
              </button>
              {travelDates.map((date, idx) => {
                const dayExpenses = tripExpenses.filter((e) => e.date === date);
                const isSelected = selectedDate === date;
                const isToday = date === new Date().toISOString().split("T")[0];
                return (
                  <button key={date} onClick={() => setSelectedDate(isSelected ? null : date)}
                    className={`shrink-0 flex flex-col items-center gap-0.5 w-14 py-2 rounded-2xl transition-all ${isSelected ? "bg-indigo-600 text-white shadow-sm" : isToday ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    <span className="text-[10px] font-medium opacity-70">{formatDayOfWeek(date)}</span>
                    <span className="text-sm font-bold leading-none">{new Date(date).getDate()}</span>
                    <span className="text-[10px] opacity-60">{idx + 1}일차</span>
                    {dayExpenses.length > 0 && <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-indigo-400"}`} />}
                  </button>
                );
              })}
            </div>
          )}
          {dateViewMode === "calendar" && (
            <CalendarView project={project} selectedDate={selectedDate} onSelectDate={(date: string) => setSelectedDate(date === selectedDate ? null : date)} />
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">총 지출</p>
            <p className="text-lg font-bold text-gray-900">{totalExpense.toLocaleString()}<span className="text-xs font-normal text-gray-400 ml-0.5">원</span></p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">지출 건수</p>
            <p className="text-lg font-bold text-gray-900">{project.expenses.length}<span className="text-xs font-normal text-gray-400 ml-0.5">건</span></p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">인당 평균</p>
            <p className="text-lg font-bold text-gray-900">{project.members.length > 0 ? Math.round(totalExpense / project.members.length).toLocaleString() : 0}<span className="text-xs font-normal text-gray-400 ml-0.5">원</span></p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 pb-24">
        {/* 지출 탭 - 멤버 필터 */}
        {activeTab === "expenses" && (
          <div className="mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs text-gray-400 shrink-0 font-medium">멤버</span>
              {/* 전체 버튼 */}
              <button
                onClick={() => setSelectedMemberId(null)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedMemberId === null
                    ? "bg-gray-800 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                전체
              </button>
              {/* 멤버별 버튼 */}
              {project.members.map((member) => {
                const memberExpenses = project.expenses.filter((e) => e.payerId === member.id);
                const memberTotal = memberExpenses.reduce((s, e) => s + e.amount, 0);
                const isSelected = selectedMemberId === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border-2 ${
                      isSelected
                        ? "text-white shadow-sm border-transparent"
                        : "bg-white text-gray-600 hover:bg-gray-50 border-gray-100"
                    }`}
                    style={isSelected ? { backgroundColor: member.color, borderColor: member.color } : {}}
                  >
                    {/* 아바타 */}
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                      style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : member.color }}
                    >
                      {member.name[0]}
                    </span>
                    <span>{member.name}</span>
                    {memberTotal > 0 && (
                      <span className={`${isSelected ? "opacity-80" : "text-gray-400"}`}>
                        {memberTotal.toLocaleString()}원
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* 선택된 멤버 요약 */}
            {selectedMemberId && (() => {
              const member = project.members.find((m) => m.id === selectedMemberId);
              if (!member) return null;
              const paid = project.expenses.filter((e) => e.payerId === selectedMemberId).reduce((s, e) => s + e.amount, 0);
              const participated = project.expenses.filter((e) => Array.isArray(e.participantIds) && e.participantIds.includes(selectedMemberId)).reduce((s, e) => s + e.amount / (e.participantIds.length || 1), 0);
              return (
                <div className="mt-3 p-3 rounded-2xl flex items-center gap-4" style={{ backgroundColor: member.color + "18" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: member.color }}>
                    {member.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: member.color }}>{member.name}</p>
                    <p className="text-xs text-gray-500">{filteredExpenses.length}건 표시 중</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">결제한 금액</p>
                    <p className="text-sm font-bold text-gray-900">{paid.toLocaleString()}원</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">부담 금액</p>
                    <p className="text-sm font-bold text-gray-900">{Math.round(participated).toLocaleString()}원</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {activeTab === "expenses" && <ExpenseList project={project} expenses={filteredExpenses} selectedDate={selectedDate} onRefresh={refetch} />}
            {activeTab === "chart" && <ChartPanel project={project} selectedDate={selectedDate} />}
            {activeTab === "settlement" && <SettlementPanel project={project} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {activeTab === "expenses" && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddExpense(true)}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      )}

      {/* 공유 링크 모달 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Share2 className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">공유 링크</h3>
                  <p className="text-xs text-gray-400">로그인 없이 볼 수 있어요</p>
                </div>
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* 링크 표시 */}
            <div className="bg-gray-50 rounded-2xl p-3 mb-4 flex items-center gap-2">
              <Link className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-600 flex-1 truncate font-mono">{shareUrl}</span>
            </div>

            {/* 안내 문구 */}
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              이 링크를 받은 친구는 <strong>로그인 없이</strong> 지출 내역과 정산 결과를 볼 수 있습니다. 수정은 불가합니다.
            </p>

            {/* 버튼들 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCopyShareLink}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3 font-semibold text-sm transition-colors"
              >
                {shareCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {shareCopied ? "복사 완료!" : "링크 복사"}
              </button>

              {/* 카카오톡 공유 */}
              <button
                onClick={() => {
                  const text = `[${project.name}] 여행 정산 내역을 공유합니다.\n\n${shareUrl}`;
                  window.open(`https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, "_blank");
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#F0D800] text-[#3C1E1E] rounded-2xl py-3 font-semibold text-sm transition-colors"
              >
                카카오톡으로 공유
              </button>

              {/* 링크 비활성화 */}
              <button
                onClick={() => {
                  if (confirm("공유 링크를 비활성화하면 친구가 더 이상 볼 수 없습니다. 계속하시겠어요?")) {
                    disableShareMutation.mutate({ id: project.id });
                  }
                }}
                disabled={disableShareMutation.isPending}
                className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-500 text-xs py-2 transition-colors"
              >
                {disableShareMutation.isPending ? "처리 중..." : "링크 비활성화"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AddExpenseModal open={showAddExpense} onClose={() => setShowAddExpense(false)} project={project}
        defaultDate={selectedDate && selectedDate !== "pre-trip" ? selectedDate : project.startDate}
        defaultIsPreTrip={selectedDate === "pre-trip"} onSaved={refetch} />
      <MembersPanel open={showMembers} onClose={() => setShowMembers(false)} project={project} onRefresh={refetch} />
      <ProjectSettingsModal open={showSettings} onClose={() => setShowSettings(false)} project={project} onRefresh={refetch} />
    </div>
  );
}
