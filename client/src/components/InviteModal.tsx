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
  const [copied, setCopied] = useState(false);

  const enableEditInviteMutation = trpc.projects.enableEditInvite.useMutation({
    onSuccess: () => utils.projects.get.invalidate({ id: project.id }),
  });
  const disableEditInviteMutation = trpc.projects.disableEditInvite.useMutation({
    onSuccess: () => utils.projects.get.invalidate({ id: project.id }),
  });

  const inviteUrl = project.editToken
    ? `${window.location.origin}/join/${project.editToken}`
    : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("초대 링크가 복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
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

        {inviteUrl ? (
          <div className="space-y-2">
            <div className="bg-[#EDEFE7] rounded-sm p-3 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="tix-mono text-xs text-gray-600 flex-1 truncate">{inviteUrl}</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "복사됨" : "링크 복사"}
              </Button>
              <Button
                onClick={() => disableEditInviteMutation.mutate({ id: project.id })}
                disabled={disableEditInviteMutation.isPending}
                variant="outline"
                className="rounded-sm border-gray-200 text-gray-500 px-3"
                title="초대 링크 비활성화"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => enableEditInviteMutation.mutate({ id: project.id })}
            disabled={enableEditInviteMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm gap-2"
          >
            <Link2 className="w-4 h-4" />
            초대 링크 만들기
          </Button>
        )}
      </motion.div>
    </div>
  );
}
