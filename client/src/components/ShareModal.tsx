// 정산 공유 모달
// Design: Clean share interface with preview

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { TravelProject } from "@/lib/types";
import { calculateSettlements, formatAmount } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  project: TravelProject;
}

export default function ShareModal({ open, onClose, project }: Props) {
  const [copied, setCopied] = useState(false);
  const { results, transfers } = calculateSettlements(
    project.members,
    project.expenses
  );

  const totalExpense = project.expenses.reduce((s, e) => s + e.amount, 0);

  const generateShareText = () => {
    const lines: string[] = [];
    lines.push(`🧳 ${project.name} 정산 내역`);
    lines.push(`📍 ${project.destination}`);
    lines.push(
      `📅 ${project.startDate.replace(/-/g, ".")} ~ ${project.endDate.replace(/-/g, ".")}`
    );
    lines.push(`👥 ${project.members.length}명`);
    lines.push("");
    lines.push(`💰 총 지출: ${formatAmount(totalExpense)}`);
    lines.push(
      `💵 1인당 평균: ${formatAmount(Math.round(totalExpense / project.members.length))}`
    );
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("📊 멤버별 현황");
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    results.forEach((r) => {
      const sign = r.balance >= 0 ? "+" : "";
      const status = r.balance >= 0 ? "💚 받을 돈" : "🔴 줄 돈";
      lines.push(`${r.memberName}`);
      lines.push(
        `  결제: ${formatAmount(r.totalPaid)} | 부담: ${formatAmount(Math.round(r.totalShare))}`
      );
      lines.push(
        `  ${status}: ${sign}${formatAmount(Math.abs(Math.round(r.balance)))}`
      );
    });
    lines.push("");
    if (transfers.length === 0) {
      lines.push("━━━━━━━━━━━━━━━━━━━━");
      lines.push("✅ 정산 완료! 모두 수고하셨어요 🎉");
    } else {
      lines.push("━━━━━━━━━━━━━━━━━━━━");
      lines.push("💸 정산 방법");
      lines.push("━━━━━━━━━━━━━━━━━━━━");
      transfers.forEach((t) => {
        const from = project.members.find((m) => m.id === t.fromId);
        const to = project.members.find((m) => m.id === t.toId);
        if (from && to) {
          lines.push(`${from.name} → ${to.name}`);
          lines.push(`  ${formatAmount(t.amount)}`);
        }
      });
    }
    lines.push("");
    lines.push("✈️ 트립스플릿으로 정산했어요");
    return lines.join("\n");
  };

  const shareText = generateShareText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("정산 내역이 클립보드에 복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${project.name} 정산 내역`,
          text: shareText,
        });
      } catch {
        // 취소
      }
    } else {
      handleCopy();
    }
  };

  const handleKakao = () => {
    // 카카오톡 공유 (클립보드 복사 후 안내)
    handleCopy();
    toast.info("복사된 내용을 카카오톡에 붙여넣기 하세요!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden max-h-[85vh]">
        {/* 헤더 */}
        <div className="bg-indigo-600 px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-4 h-4 text-indigo-200" />
            <span className="text-indigo-200 text-sm">정산 내역 공유</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              {project.name}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* 미리보기 */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-xs font-medium text-gray-500 mb-2">미리보기</p>
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto border border-gray-100">
            {shareText}
          </div>
        </div>

        {/* 공유 버튼들 */}
        <div className="px-6 pb-6 space-y-2 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleShare}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium gap-2"
            >
              <Share2 className="w-4 h-4" />
              공유하기
            </Button>
            <Button
              onClick={handleCopy}
              variant="outline"
              className={`rounded-xl border-gray-200 font-medium gap-2 transition-all ${
                copied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "text-gray-600"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  텍스트 복사
                </>
              )}
            </Button>
          </div>
          <Button
            onClick={handleKakao}
            className="w-full bg-[#FEE500] hover:bg-[#F0D900] text-[#3C1E1E] rounded-xl font-medium gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            카카오톡으로 공유
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
