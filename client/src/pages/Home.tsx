// 여행 정산 앱 - 홈 페이지 (랜딩 + 프로젝트 목록)
// Design: Scandinavian Minimal + Travel Scrapbook
// Colors: Indigo primary (#4F46E5), white background, pastel category accents

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MapPin, Calendar, Users, Trash2, ArrowRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { formatAmount } from "@/lib/types";
import CreateProjectModal from "@/components/CreateProjectModal";

export default function Home() {
  const [, navigate] = useLocation();
  const { projects, selectProject, deleteProject } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleOpenProject = (id: string) => {
    selectProject(id);
    navigate(`/project/${id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm === id) {
      deleteProject(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">
              트립스플릿
            </span>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 h-9 text-sm font-medium gap-1.5"
          >
            <Plus className="w-4 h-4" />
            새 여행
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {projects.length === 0 ? (
          /* 빈 상태 */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663399785344/chJuDgeTCigwkJFTVfRKZv/empty-state-Ag6qtPAUFgsgfRkVkXCNBA.webp"
              alt="여행 시작"
              className="w-40 h-40 object-contain mb-8 opacity-80"
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              첫 여행을 시작해볼까요?
            </h2>
            <p className="text-gray-500 mb-8 max-w-sm leading-relaxed">
              여행 프로젝트를 만들고 친구들과 함께 지출을 기록하고 정산해보세요.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 h-11 text-base font-medium gap-2"
            >
              <Plus className="w-5 h-5" />
              새 여행 만들기
            </Button>
          </div>
        ) : (
          <>
            {/* 히어로 배너 */}
            <div className="relative rounded-2xl overflow-hidden mb-10 h-48 sm:h-56">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663399785344/chJuDgeTCigwkJFTVfRKZv/hero-banner-QvVDxSD8tgXidSJvLnunUf.webp"
                alt="여행"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/70 via-indigo-800/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center px-8">
                <p className="text-indigo-200 text-sm font-medium mb-1">
                  함께하는 여행 정산
                </p>
                <h1 className="text-white text-2xl sm:text-3xl font-bold leading-tight">
                  투명하고 간편한
                  <br />
                  여행 경비 관리
                </h1>
              </div>
            </div>

            {/* 프로젝트 목록 */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                내 여행 ({projects.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {projects.map((project, idx) => {
                  const totalExpense = project.expenses.reduce(
                    (s, e) => s + e.amount,
                    0
                  );
                  const memberCount = project.members.length;
                  const startDate = new Date(project.startDate);
                  const endDate = new Date(project.endDate);
                  const days =
                    Math.ceil(
                      (endDate.getTime() - startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1;

                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleOpenProject(project.id)}
                      className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative"
                    >
                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          deleteConfirm === project.id
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100"
                        }`}
                        title={
                          deleteConfirm === project.id
                            ? "한 번 더 클릭하면 삭제됩니다"
                            : "삭제"
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* 여행지 */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <span className="text-xs font-medium text-indigo-600">
                          {project.destination}
                        </span>
                      </div>

                      {/* 프로젝트 이름 */}
                      <h3 className="font-bold text-gray-900 text-base mb-1 pr-6">
                        {project.name}
                      </h3>

                      {/* 날짜 */}
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {startDate.toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          ~{" "}
                          {endDate.toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span>{days}일</span>
                      </div>

                      {/* 통계 */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">총 지출</p>
                          <p className="text-sm font-bold text-gray-900">
                            {formatAmount(totalExpense)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-1.5">
                            {project.members.slice(0, 3).map((m) => (
                              <div
                                key={m.id}
                                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: m.color }}
                              >
                                {m.name[0]}
                              </div>
                            ))}
                            {memberCount > 3 && (
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
                                +{memberCount - 3}
                              </div>
                            )}
                          </div>
                          <Users className="w-3.5 h-3.5 text-gray-300 ml-1" />
                          <span className="text-xs text-gray-400">
                            {memberCount}명
                          </span>
                        </div>
                      </div>

                      {/* 화살표 */}
                      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-indigo-400" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* 새 여행 추가 카드 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: projects.length * 0.05 }}
                onClick={() => setShowCreate(true)}
                className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-200 flex flex-col items-center justify-center min-h-[180px] gap-3"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-sm font-medium text-gray-500">새 여행 추가</p>
              </motion.div>
            </div>
          </>
        )}
      </main>

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
