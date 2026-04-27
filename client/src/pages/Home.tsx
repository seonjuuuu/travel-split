import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  LogIn,
  LogOut,
  MapPin,
  Plane,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import CreateProjectModal from "@/components/CreateProjectModal";

function formatAmount(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

export default function Home() {
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // OAuth 오류 파라미터 감지
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      toast.error("로그인 오류: " + authError);
      // URL에서 파라미터 제거
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const { data: projects = [], refetch } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleOpenProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm === id) {
      deleteProject.mutate({ id });
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

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: "#6366f1" }}
                  >
                    {user?.name?.[0] ?? "U"}
                  </div>
                  <span className="text-sm text-gray-600">{user?.name}</span>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4 h-9 text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  새 여행
                </button>
                <button
                  onClick={logout}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* 비로그인 상태 */}
        {!isAuthenticated && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
              <Plane className="w-10 h-10 text-indigo-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              트립스플릿
            </h1>
            <p className="text-gray-500 mb-2 text-lg">
              친구와 함께하는 여행 경비 정산
            </p>
            <p className="text-gray-400 text-sm mb-10 max-w-sm leading-relaxed">
              여행 프로젝트를 만들고 지출을 기록하면<br />
              자동으로 정산 금액을 계산해 드립니다.
            </p>
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 h-12 text-base font-medium transition-colors shadow-lg shadow-indigo-200"
            >
              <LogIn className="w-5 h-5" />
              로그인하고 시작하기
            </a>
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { icon: "✈️", title: "사전 결제 관리", desc: "항공권·숙소 등 여행 전 지출도 기록" },
                { icon: "📊", title: "그래프 분석", desc: "카테고리별·날짜별 지출 시각화" },
                { icon: "💸", title: "간편 정산", desc: "최소 이체 횟수로 정산 계산" },
              ].map((f) => (
                <div key={f.title} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <p className="text-xs font-semibold text-gray-800 mb-1">{f.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 로그인 후 프로젝트 목록 */}
        {isAuthenticated && !loading && (
          <>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                  <Plane className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  첫 여행을 시작해볼까요?
                </h2>
                <p className="text-gray-500 mb-8 max-w-sm leading-relaxed">
                  여행 프로젝트를 만들고 친구들과 함께 지출을 기록하고 정산해보세요.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 h-11 text-base font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  새 여행 만들기
                </button>
              </div>
            ) : (
              <>
                {/* 히어로 배너 */}
                <div className="relative rounded-2xl overflow-hidden mb-10 h-48 sm:h-56 bg-gradient-to-r from-indigo-600 to-indigo-400">
                  <div className="absolute inset-0 flex flex-col justify-center px-8">
                    <p className="text-indigo-200 text-sm font-medium mb-1">
                      함께하는 여행 정산
                    </p>
                    <h1 className="text-white text-2xl sm:text-3xl font-bold leading-tight">
                      투명하고 간편한<br />여행 경비 관리
                    </h1>
                  </div>
                  <div className="absolute right-8 bottom-0 opacity-20">
                    <Plane className="w-32 h-32 text-white" />
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
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Users className="w-3.5 h-3.5" />
                              <span>멤버 관리</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowRight className="w-4 h-4 text-indigo-400" />
                            </div>
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
          </>
        )}
      </main>

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
