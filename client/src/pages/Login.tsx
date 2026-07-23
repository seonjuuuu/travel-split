// 로그인 / 회원가입 페이지 — 보딩패스 컨셉
import { supabase } from "@/lib/supabase";
import { Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33C2.44 15.98 5.48 18 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.95H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.6-2.6C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);

  // 초대 링크 등에서 로그인 후 되돌아갈 경로 (예: /login?redirect=/join/abc123)
  const redirectParam = new URLSearchParams(window.location.search).get("redirect");
  const destination = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  useEffect(() => {
    document.title = "로그인 - 트립스플릿";
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = "이메일을 입력해주세요";
    if (!form.password) errs.password = "비밀번호를 입력해주세요";
    else if (mode === "register" && form.password.length < 8)
      errs.password = "비밀번호는 8자 이상이어야 합니다";
    if (mode === "register" && !form.name.trim()) errs.name = "이름을 입력해주세요";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsPending(true);
    const { error } =
      mode === "register"
        ? await supabase.auth.signUp({
            email: form.email.trim(),
            password: form.password,
            options: { data: { name: form.name.trim() } },
          })
        : await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          });
    setIsPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    navigate(destination);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${destination}` },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-[#E4E6DF] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="tix-mono font-bold text-xl text-[#12222D] tracking-tight">
            TRIP<span className="text-indigo-600">·</span>SPLIT
          </span>
        </div>

        <div className="bg-[#F6F7F2] border border-[#12222D]/12 rounded-sm shadow-sm">
          {/* 티켓 상단: eyebrow + 모드 전환 */}
          <div className="px-6 pt-6 pb-5 flex items-start justify-between">
            <div>
              <div className="text-[10px] tracking-[0.14em] uppercase text-indigo-600 font-bold mb-1.5">
                Passenger Access
              </div>
              <h1 className="text-2xl font-bold text-[#12222D] tracking-tight">
                {mode === "login" ? "탑승 수속" : "신규 발권"}
              </h1>
            </div>
            <div className="text-right text-[11px] text-[#5B6B72]">
              CLASS
              <div className="tix-mono text-sm text-[#12222D]">MEMBER</div>
            </div>
          </div>

          {/* 로그인/회원가입 전환 탭 */}
          <div className="px-6 flex gap-4 border-b border-[#12222D]/10">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                mode === "login"
                  ? "border-indigo-600 text-[#12222D]"
                  : "border-transparent text-[#5B6B72]"
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                mode === "register"
                  ? "border-indigo-600 text-[#12222D]"
                  : "border-transparent text-[#5B6B72]"
              }`}
            >
              회원가입
            </button>
          </div>

          <form id="login-form" onSubmit={handleSubmit} className="px-6 pt-5 pb-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-[10px] tracking-[0.12em] uppercase text-[#5B6B72] flex items-center gap-1.5 mb-1.5">
                  <User className="w-3 h-3" />
                  이름
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="홍길동"
                  className={`w-full bg-[#EDEFE7] border rounded-sm px-3 py-2.5 text-sm text-[#12222D] outline-none focus:ring-2 focus:ring-indigo-600 ${
                    errors.name ? "border-red-400" : "border-[#12222D]/12"
                  }`}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
            )}

            <div>
              <label className="text-[10px] tracking-[0.12em] uppercase text-[#5B6B72] flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3 h-3" />
                이메일
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className={`w-full bg-[#EDEFE7] border rounded-sm px-3 py-2.5 text-sm text-[#12222D] tix-mono outline-none focus:ring-2 focus:ring-indigo-600 ${
                  errors.email ? "border-red-400" : "border-[#12222D]/12"
                }`}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="text-[10px] tracking-[0.12em] uppercase text-[#5B6B72] mb-1.5 block">
                비밀번호
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className={`w-full bg-[#EDEFE7] border rounded-sm px-3 py-2.5 text-sm text-[#12222D] outline-none focus:ring-2 focus:ring-indigo-600 ${
                  errors.password ? "border-red-400" : "border-[#12222D]/12"
                }`}
              />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
            </div>
          </form>

          {/* 절취선 */}
          <div className="tix-perf" style={{ ["--tix-hole-bg" as string]: "#E4E6DF" }} />

          {/* 티켓 스텁: 액션 버튼 */}
          <div className="px-6 py-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center gap-2 px-4 py-2.5 rounded-sm border border-[#12222D]/15 text-sm text-[#12222D] hover:bg-[#EDEFE7] transition-colors"
            >
              <GoogleIcon />
              Google로 계속하기
            </button>
            <button
              type="submit"
              form="login-form"
              disabled={isPending}
              className="tix-mono flex items-center gap-2 px-5 py-2.5 rounded-sm bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60"
            >
              {isPending ? "처리 중" : mode === "register" ? "발권" : "Board"} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
