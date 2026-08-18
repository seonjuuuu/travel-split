// 친구를 공동 편집자로 초대하는 모달
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Link2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { TravelProject } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  project: TravelProject;
}

export default function InviteModal({ open, onClose, project }: Props) {
  const utils = trpc.useUtils();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const enableEditInviteMutation = trpc.projects.enableEditInvite.useMutation({
    onSuccess: () => utils.projects.get.invalidate({ id: project.id }),
  });
  const disableEditInviteMutation = trpc.projects.disableEditInvite.useMutation({
    onSuccess: () => utils.projects.get.invalidate({ id: project.id }),
  });

  const inviteUrl = project.editToken
    ? `${window.location.origin}/join/${project.editToken}`
    : null;

  const handleCopyCode = async () => {
    if (!project.inviteCode) return;
    try {
      await navigator.clipboard.writeText(project.inviteCode);
      setCopiedCode(true);
      toast.success("초대 코드가 복사되었습니다!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast.success("초대 링크가 복사되었습니다!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
        className="bg-[#F6F7F2] rounded-sm w-full max-w-sm p-6 shadow-2xl border border-[#12222D]/12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-100 rounded-sm flex items-center justify-center">
              <UserPlus className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#12222D] text-base">친구 초대</h3>
              <p className="text-xs text-[#5B6B72]">가입하면 같이 편집할 수 있어요</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-sm hover:bg-[#EDEFE7] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          이 링크를 받은 친구가 <strong>가입/로그인</strong>하면 이 여행의 지출을 함께 기록하고 수정할 수 있어요.
          (읽기 전용 공유와는 달라요 — 그건 상단 공유 아이콘에서 따로 할 수 있습니다.)
        </p>

        {inviteUrl && project.inviteCode ? (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] tracking-[0.12em] uppercase text-[#5B6B72] mb-1.5">초대 코드</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#EDEFE7] rounded-sm px-3 py-2.5 flex items-center justify-center">
                  <span className="tix-mono text-lg font-bold text-[#12222D] tracking-[0.2em]">
                    {project.inviteCode}
                  </span>
                </div>
                <Button
                  onClick={handleCopyCode}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm gap-2 px-4"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? "복사됨" : "복사"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#12222D]/10" />
              <span className="text-xs text-[#5B6B72]">또는</span>
              <div className="flex-1 h-px bg-[#12222D]/10" />
            </div>

            <div>
              <p className="text-[10px] tracking-[0.12em] uppercase text-[#5B6B72] mb-1.5">초대 링크</p>
              <div className="bg-[#EDEFE7] rounded-sm p-3 flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="tix-mono text-xs text-gray-600 flex-1 truncate">{inviteUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="flex-1 rounded-sm border-gray-200 text-gray-600 gap-2"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? "복사됨" : "링크 복사"}
                </Button>
                <Button
                  onClick={() => disableEditInviteMutation.mutate({ id: project.id })}
                  disabled={disableEditInviteMutation.isPending}
                  variant="outline"
                  className="rounded-sm border-gray-200 text-gray-500 px-3"
                  title="초대 비활성화"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => enableEditInviteMutation.mutate({ id: project.id })}
            disabled={enableEditInviteMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm gap-2"
          >
            <Link2 className="w-4 h-4" />
            초대 코드 만들기
          </Button>
        )}
      </motion.div>
    </div>
  );
}
