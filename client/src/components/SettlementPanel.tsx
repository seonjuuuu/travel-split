// 정산 패널 컴포넌트
// Design: Clear settlement visualization with share button

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Share2, Copy, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import type { TravelProject } from "@/lib/types";
import ShareModal from "@/components/ShareModal";
import {
  calculateSettlements,
  formatAmount,
} from "@/lib/types";
import { toast } from "sonner";

interface Props {
  project: TravelProject;
}

export default function SettlementPanel({ project }: Props) {
  const { settledTransfers, toggleSettlement, resetSettlements } = useApp();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFullShare, setShowFullShare] = useState(false);

  const { results, transfers } = calculateSettlements(
    project.members,
    project.expenses
  );

  const totalExpense = project.expenses.reduce((s, e) => s + e.amount, 0);

  const getTransferKey = (fromId: string, toId: string, amount: number) =>
    `${project.id}-${fromId}-${toId}-${amount}`;

  const allSettled =
    transfers.length > 0 &&
    transfers.every((t) =>
      settledTransfers[getTransferKey(t.fromId, t.toId, t.amount)]
    );

  const generateShareText = () => {
    const lines: string[] = [];
    lines.push(`🧳 ${project.name} 정산 내역`);
    lines.push(`📍 ${project.destination}`);
    lines.push(`📅 ${project.startDate} ~ ${project.endDate}`);
    lines.push("");
    lines.push(`💰 총 지출: ${formatAmount(totalExpense)}`);
    lines.push(`👥 인원: ${project.members.length}명`);
    lines.push("");
    lines.push("📊 멤버별 지출 현황");
    results.forEach((r) => {
      const sign = r.balance >= 0 ? "+" : "";
      lines.push(
        `  ${r.memberName}: 결제 ${formatAmount(r.totalPaid)} / 부담 ${formatAmount(Math.round(r.totalShare))} (${sign}${formatAmount(Math.round(r.balance))})`
      );
    });
    lines.push("");
    if (transfers.length === 0) {
      lines.push("✅ 정산이 완료되었습니다!");
    } else {
      lines.push("💸 정산 방법");
      transfers.forEach((t) => {
        const from = project.members.find((m) => m.id === t.fromId);
        const to = project.members.find((m) => m.id === t.toId);
        if (from && to) {
          lines.push(
            `  ${from.name} → ${to.name}: ${formatAmount(t.amount)}`
          );
        }
      });
    }
    lines.push("");
    lines.push("트립스플릿으로 정산했어요 ✈️");
    return lines.join("\n");
  };

  const handleCopyText = async () => {
    const text = generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("정산 내역이 복사되었습니다!");
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const handleShare = async () => {
    const text = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // 취소
      }
    } else {
      handleCopyText();
    }
  };

  if (project.members.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">멤버를 추가해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 멤버별 정산 현황 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-900 text-sm">멤버별 정산 현황</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            총 지출 {formatAmount(totalExpense)}
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {results.map((result, idx) => {
            const member = project.members.find(
              (m) => m.id === result.memberId
            );
            if (!member) return null;

            const isPositive = result.balance >= 0;
            const balanceAbs = Math.abs(Math.round(result.balance));

            return (
              <motion.div
                key={result.memberId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  {/* 아바타 */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name[0]}
                  </div>

                  {/* 이름 + 금액 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {member.name}
                        {member.isMe && (
                          <span className="text-xs text-indigo-500 ml-1">(나)</span>
                        )}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isPositive ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {isPositive ? "+" : "-"}
                        {formatAmount(balanceAbs)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>결제 {formatAmount(result.totalPaid)}</span>
                      <span className="text-gray-200">·</span>
                      <span>
                        부담 {formatAmount(Math.round(result.totalShare))}
                      </span>
                    </div>
                    {/* 프로그레스 바 */}
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${
                            totalExpense > 0
                              ? Math.min(
                                  (result.totalPaid / totalExpense) * 100,
                                  100
                                )
                              : 0
                          }%`,
                          backgroundColor: member.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 정산 방법 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">정산 방법</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {transfers.length === 0
                ? "정산이 필요 없어요"
                : `${transfers.length}건의 이체가 필요해요`}
            </p>
          </div>
          {allSettled && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
              <Check className="w-3 h-3" />
              완료
            </span>
          )}
        </div>

        {transfers.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              모든 정산이 완료되었어요!
            </p>
            <p className="text-xs text-gray-400 mt-1">
              지출이 균등하게 분배되었습니다
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transfers.map((transfer, idx) => {
              const from = project.members.find((m) => m.id === transfer.fromId);
              const to = project.members.find((m) => m.id === transfer.toId);
              if (!from || !to) return null;

              const key = getTransferKey(
                transfer.fromId,
                transfer.toId,
                transfer.amount
              );
              const isSettled = settledTransfers[key];

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`px-5 py-4 transition-colors ${
                    isSettled ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* From */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: from.color }}
                      >
                        {from.name[0]}
                      </div>
                      <span
                        className={`text-sm font-medium truncate ${
                          isSettled ? "text-gray-400 line-through" : "text-gray-900"
                        }`}
                      >
                        {from.name}
                      </span>
                    </div>

                    {/* 화살표 + 금액 */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className={`text-xs font-bold ${
                          isSettled ? "text-gray-300" : "text-indigo-600"
                        }`}
                      >
                        {formatAmount(transfer.amount)}
                      </span>
                      <ArrowRight
                        className={`w-4 h-4 ${
                          isSettled ? "text-gray-300" : "text-indigo-400"
                        }`}
                      />
                    </div>

                    {/* To */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span
                        className={`text-sm font-medium truncate ${
                          isSettled ? "text-gray-400 line-through" : "text-gray-900"
                        }`}
                      >
                        {to.name}
                      </span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: to.color }}
                      >
                        {to.name[0]}
                      </div>
                    </div>

                    {/* 완료 체크 */}
                    <button
                      onClick={() => toggleSettlement(key)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        isSettled
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowFullShare(true)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium gap-2"
        >
          <Share2 className="w-4 h-4" />
          정산 내역 공유
        </Button>
        <Button
          onClick={handleCopyText}
          variant="outline"
          className="rounded-xl border-gray-200 text-gray-600 gap-2 px-4"
        >
          <Copy className="w-4 h-4" />
          복사
        </Button>
      </div>

      <ShareModal
        open={showFullShare}
        onClose={() => setShowFullShare(false)}
        project={project}
      />

      {transfers.length > 0 && (
        <button
          onClick={() => resetSettlements(project.id)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          정산 상태 초기화
        </button>
      )}
    </div>
  );
}
