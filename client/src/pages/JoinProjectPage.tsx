// 초대 링크로 프로젝트 공동 편집자로 참여하는 페이지
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Check, MapPin, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function JoinProjectPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    document.title = "여행 참여하기 - 트립스플릿";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/join/${token}`);
    }
  }, [authLoading, isAuthenticated, navigate, token]);

  const { data: preview, isLoading: previewLoading } = trpc.projects.getJoinPreview.useQuery(
    { editToken: token ?? "" },
    { enabled: isAuthenticated && !!token }
  );

  const joinMutation = trpc.projects.joinByEditToken.useMutation({
    onSuccess: (data) => navigate(`/project/${data.projectId}`),
    onError: (error) => toast.error(error.message),
  });

  const handleJoin = () => {
    if (!token) return;
    if (selectedMemberId) {
      joinMutation.mutate({ editToken: token, memberId: selectedMemberId });
    } else if (newName.trim()) {
      joinMutation.mutate({ editToken: token, newMemberName: newName.trim() });
    } else {
      toast.error("본인이 누구인지 선택하거나 이름을 입력해주세요");
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#E4E6DF] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (previewLoading) {
    return (
      <div className="min-h-screen bg-[#E4E6DF] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-[#E4E6DF] flex items-center justify-center px-4">
        <div className="bg-[#F6F7F2] border border-[#12222D]/12 rounded-sm p-8 text-center max-w-sm">
          <p className="text-[#12222D] font-bold mb-2">유효하지 않은 초대 링크예요</p>
          <p className="text-sm text-[#5B6B72] mb-6">
            링크가 만료되었거나 잘못된 주소일 수 있어요.
          </p>
          <button
            onClick={() => navigate("/")}
            className="tix-mono inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E6DF] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="tix-mono font-bold text-xl text-[#12222D] tracking-tight">
            TRIP<span className="text-indigo-600">·</span>SPLIT
          </span>
        </div>

        <div className="bg-[#F6F7F2] border border-[#12222D]/12 rounded-sm shadow-sm">
          <div className="px-6 pt-6 pb-5">
            <div className="text-[10px] tracking-[0.14em] uppercase text-indigo-600 font-bold mb-1.5">
              Boarding Invitation
            </div>
            <h1 className="text-xl font-bold text-[#12222D] tracking-tight mb-1">
              {preview.project.name}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-[#5B6B72]">
              <MapPin className="w-3.5 h-3.5" />
              {preview.project.destination}
            </div>
          </div>

          <div className="tix-perf" style={{ ["--tix-hole-bg" as string]: "#E4E6DF" }} />

          <div className="px-6 pt-5 pb-6 space-y-4">
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#12222D]">
              <Users className="w-4 h-4 text-indigo-600" />
              이 중에 본인이 누구세요?
            </div>

            {preview.members.length > 0 && (
              <div className="space-y-2">
                {preview.members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(m.id === selectedMemberId ? null : m.id);
                      setNewName("");
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm border-2 transition-all ${
                      selectedMemberId === m.id
                        ? "border-current"
                        : "border-transparent bg-[#EDEFE7] hover:bg-[#E4E6DF]"
                    }`}
                    style={selectedMemberId === m.id ? { backgroundColor: m.color + "18", borderColor: m.color } : {}}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name[0]}
                    </div>
                    <span className="text-sm font-medium text-[#12222D] flex-1 text-left">{m.name}</span>
                    {selectedMemberId === m.id && <Check className="w-4 h-4" style={{ color: m.color }} />}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#12222D]/10" />
              <span className="text-xs text-[#5B6B72]">또는</span>
              <div className="flex-1 h-px bg-[#12222D]/10" />
            </div>

            <div>
              <label className="text-[10px] tracking-[0.12em] uppercase text-[#5B6B72] mb-1.5 block">
                새 멤버로 참여
              </label>
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setSelectedMemberId(null);
                }}
                placeholder="본인 이름 입력"
                className="w-full bg-[#EDEFE7] border border-[#12222D]/12 rounded-sm px-3 py-2.5 text-sm text-[#12222D] outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={joinMutation.isPending || (!selectedMemberId && !newName.trim())}
              className="tix-mono w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm h-11 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {joinMutation.isPending ? "참여 중" : "여행 참여하기"} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
