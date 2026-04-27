// 트립스플릿 - 홈 페이지 (랜딩 + 프로젝트 목록)
// Design: Clean Bold — no gradients, no box-shadows
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import CreateProjectModal from "@/components/CreateProjectModal";

// ── 트립스플릿 로고 SVG ──────────────────────────────────────────────
function TripSplitLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="트립스플릿 로고"
    >
      {/* 배경 */}
      <rect width="32" height="32" rx="9" fill="#4F46E5" />
      {/* 비행기 몸통 */}
      <path
        d="M7 16.5L14 13L17.5 7L20 9.5L16.5 13L22 11.5L23.5 13L17 16.5L19 24L16.5 24.5L14 18.5L10 20L9 18.5L11.5 17L7 16.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      {/* 정산 분리선 — 두 개의 작은 점 */}
      <circle cx="24" cy="22" r="1.5" fill="white" fillOpacity="0.5" />
      <circle cx="20.5" cy="25" r="1.5" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

// ── 로그인 후 헤더용 소형 로고 ──────────────────────────────────────
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="9" fill="#4F46E5" />
      <path
        d="M7 16.5L14 13L17.5 7L20 9.5L16.5 13L22 11.5L23.5 13L17 16.5L19 24L16.5 24.5L14 18.5L10 20L9 18.5L11.5 17L7 16.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      <circle cx="24" cy="22" r="1.5" fill="white" fillOpacity="0.5" />
      <circle cx="20.5" cy="25" r="1.5" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    document.title = "트립스플릿 - 여행 경비 정산 앱 | 친구와 함께하는 스마트 여행 정산";
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      toast.error("로그인 오류: " + authError);
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

  const handleOpenProject = (id: string) => navigate(`/project/${id}`);

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

  // ── 로그인 후 대시보드 ──────────────────────────────────────────────
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <LogoMark size={32} />
              <span className="font-bold text-gray-900 text-lg tracking-tight">트립스플릿</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
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
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {loading && (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && (
            <>
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                    <LogoMark size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">첫 여행을 시작해볼까요?</h2>
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
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900">내 여행 ({projects.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {projects.map((project, idx) => {
                        const startDate = new Date(project.startDate);
                        const endDate = new Date(project.endDate);
                        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        return (
                          <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => handleOpenProject(project.id)}
                            className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 group relative"
                          >
                            <button
                              onClick={(e) => handleDelete(project.id, e)}
                              className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                deleteConfirm === project.id
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100"
                              }`}
                              title={deleteConfirm === project.id ? "한 번 더 클릭하면 삭제됩니다" : "삭제"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-1.5 mb-3">
                              <div className="w-6 h-6 bg-indigo-50 rounded-full flex items-center justify-center">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-medium text-indigo-600">{project.destination}</span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-base mb-1 pr-6">{project.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {startDate.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ~{" "}
                                {endDate.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span>{days}일</span>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Users className="w-3.5 h-3.5" />
                                <span>여행 보기</span>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="w-4 h-4 text-indigo-400" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: projects.length * 0.05 }}
                      onClick={() => setShowCreate(true)}
                      className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-200 flex flex-col items-center justify-center min-h-[180px] gap-3"
                    >
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
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

  // ── 비로그인 랜딩 페이지 ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TripSplitLogo size={32} />
            <span className="font-bold text-gray-900 text-lg tracking-tight">트립스플릿</span>
          </div>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 h-9 text-sm font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            시작하기
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-7">
              <Sparkles className="w-3.5 h-3.5" />
              무료로 시작하는 스마트 여행 정산
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6">
              여행 경비,<br />
              <span className="text-indigo-600">이제 스마트하게</span><br />
              정산하세요
            </h1>

            <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-xl">
              친구, 가족과 함께하는 여행의 모든 지출을 기록하고,
              최소 이체 횟수로 깔끔하게 정산하세요.
              복잡한 계산은 트립스플릿이 대신합니다.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <a
                href={getLoginUrl()}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 h-14 text-lg font-semibold transition-colors"
              >
                무료로 시작하기
                <ChevronRight className="w-5 h-5" />
              </a>
              <p className="text-sm text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                신용카드 불필요 · 완전 무료
              </p>
            </div>
          </motion.div>

          {/* Hero 카드 미리보기 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl"
          >
            {[
              {
                label: "총 지출",
                value: "₩ 842,000",
                sub: "3박 4일 오사카 여행",
                bg: "bg-indigo-600",
                labelColor: "text-indigo-200",
                valueColor: "text-white",
                subColor: "text-indigo-200",
              },
              {
                label: "정산 완료",
                value: "4명",
                sub: "최소 3번 이체로 완료",
                bg: "bg-gray-50",
                labelColor: "text-gray-400",
                valueColor: "text-gray-900",
                subColor: "text-gray-400",
                border: true,
              },
              {
                label: "절약된 이체",
                value: "3회",
                sub: "최적화 알고리즘 적용",
                bg: "bg-emerald-50",
                labelColor: "text-emerald-500",
                valueColor: "text-emerald-800",
                subColor: "text-emerald-500",
                border: true,
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-2xl p-5 ${card.bg} ${card.border ? "border border-gray-100" : ""}`}
              >
                <p className={`text-xs font-medium mb-1 ${card.labelColor}`}>{card.label}</p>
                <p className={`text-2xl font-black mb-1 ${card.valueColor}`}>{card.value}</p>
                <p className={`text-xs ${card.subColor}`}>{card.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-indigo-600 font-semibold text-sm mb-3 tracking-wide uppercase">Features</p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">여행 정산의 모든 것</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              지출 기록부터 정산 완료까지, 여행 경비 관리에 필요한 모든 기능을 제공합니다.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Wallet className="w-6 h-6" />,
                color: "bg-indigo-50 text-indigo-600",
                title: "스마트 지출 기록",
                desc: "카테고리, 날짜, 결제자, 분담 멤버를 한 번에 기록하세요. 공동경비는 자동으로 균등 분배됩니다.",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                color: "bg-purple-50 text-purple-600",
                title: "카테고리별 분석",
                desc: "식비, 교통, 숙소, 관광 등 카테고리별 지출을 차트로 한눈에 파악하세요.",
              },
              {
                icon: <Users className="w-6 h-6" />,
                color: "bg-emerald-50 text-emerald-600",
                title: "최소 이체 정산",
                desc: "복잡한 계산 없이 최소 이체 횟수로 모든 멤버의 정산을 완료하는 최적 경로를 제시합니다.",
              },
              {
                icon: <Share2 className="w-6 h-6" />,
                color: "bg-orange-50 text-orange-600",
                title: "공유 링크",
                desc: "정산 내역을 링크 하나로 공유하세요. 앱 설치 없이 누구나 확인할 수 있습니다.",
              },
              {
                icon: <Calendar className="w-6 h-6" />,
                color: "bg-blue-50 text-blue-600",
                title: "사전 경비 관리",
                desc: "항공권, 숙소 등 여행 전 결제한 비용도 별도로 기록하고 정산에 포함하세요.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                color: "bg-pink-50 text-pink-600",
                title: "안전한 데이터",
                desc: "모든 여행 데이터는 안전하게 저장됩니다. 언제 어디서나 여행 내역을 확인하세요.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-indigo-100 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 앱 미리보기 */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-indigo-600 font-semibold text-sm mb-3 tracking-wide uppercase">Product Preview</p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">이렇게 사용해요</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              직관적인 UI로 여행 경비를 기록하고, 한 번에 정산까지 완료하세요.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {[
              {
                img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663399785344/chJuDgeTCigwkJFTVfRKZv/mockup-projects-94nXgcqMqCEw8fbztgmGDi.webp",
                step: "01",
                title: "여행 프로젝트 한눈에",
                desc: "내 모든 여행을 카드로 정리하고, 멤버·날짜·총 지출을 바로 확인하세요.",
              },
              {
                img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663399785344/chJuDgeTCigwkJFTVfRKZv/mockup-expenses-ePug7HCxyJP7LmXaBo6p4d.webp",
                step: "02",
                title: "지출 기록 & 필터링",
                desc: "날짜별·멤버별로 지출을 필터링하고, 공동경비는 자동으로 균등 분배됩니다.",
              },
              {
                img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663399785344/chJuDgeTCigwkJFTVfRKZv/mockup-settlement-bzTyeF4aqqiuWLtHFD6qbT.webp",
                step: "03",
                title: "최소 이체 정산 결과",
                desc: "복잡한 계산 없이 최소 이체 횟수로 모든 멤버의 정산을 완료하세요.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="flex flex-col items-center"
              >
                {/* 폰 목업 이미지 */}
                <div className="w-full max-w-[260px] mx-auto mb-6">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full rounded-3xl"
                    loading="lazy"
                  />
                </div>
                {/* 설명 */}
                <div className="text-center">
                  <span className="inline-block text-xs font-bold text-indigo-600 bg-indigo-50 rounded-full px-3 py-1 mb-3">
                    STEP {item.step}
                  </span>
                  <h3 className="font-bold text-gray-900 text-xl mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 사용 흐름 */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-indigo-600 font-semibold text-sm mb-3 tracking-wide uppercase">How it works</p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">3단계로 끝나는 정산</h2>
            <p className="text-gray-500 text-lg">복잡한 설정 없이 바로 시작하세요.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "여행 프로젝트 생성",
                desc: "여행 이름, 목적지, 날짜, 멤버를 입력하고 프로젝트를 만드세요. 1분이면 충분합니다.",
                bg: "bg-indigo-600",
              },
              {
                step: "02",
                title: "지출 기록",
                desc: "여행 중 발생하는 모든 지출을 실시간으로 기록하세요. 결제자와 분담 멤버를 지정하면 됩니다.",
                bg: "bg-gray-900",
              },
              {
                step: "03",
                title: "정산 완료",
                desc: "트립스플릿이 최소 이체 횟수로 정산 방법을 계산해드립니다. 링크로 공유하면 끝.",
                bg: "bg-emerald-600",
              },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.15 }}
                className="text-center"
              >
                <div className={`w-20 h-20 ${step.bg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <span className="text-white text-2xl font-black">{step.step}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-xl mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 소셜 프루프 배너 */}
      <section className="py-16 px-4 sm:px-6 bg-indigo-600">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "무료", label: "완전 무료 서비스" },
              { value: "최소", label: "이체 횟수 최적화" },
              { value: "즉시", label: "공유 링크 생성" },
              { value: "∞", label: "여행 프로젝트 생성" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-indigo-200 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-8">
              <TripSplitLogo size={64} />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">
              다음 여행,<br />
              <span className="text-indigo-600">트립스플릿과 함께</span>
            </h2>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              여행 후 복잡한 정산 때문에 스트레스받지 마세요.<br />
              트립스플릿이 깔끔하게 해결해드립니다.
            </p>
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-10 h-16 text-xl font-bold transition-colors"
            >
              지금 무료로 시작하기
              <ChevronRight className="w-6 h-6" />
            </a>
            <p className="mt-4 text-sm text-gray-400">
              로그인 한 번으로 바로 시작 · 신용카드 불필요
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <TripSplitLogo size={24} />
            <span className="font-bold text-gray-700 text-sm">트립스플릿</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2025 트립스플릿 · 친구와 함께하는 스마트 여행 정산
          </p>
        </div>
      </footer>
    </div>
  );
}
