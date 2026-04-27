// 멤버 관리 패널 (Sheet/Drawer)
// Design: Clean member list with avatar system + color picker

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { TravelProject } from "@/lib/types";
import { MEMBER_COLORS, MEMBER_COLOR_NAMES, getNextMemberColor } from "@/lib/types";
import { Plus, Trash2, Crown, UserPlus, Check, Palette } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  project: TravelProject;
  onRefresh?: () => void;
}

// 색상 선택 팔레트 컴포넌트
function ColorPicker({
  value,
  onChange,
  usedColors = [],
}: {
  value: string;
  onChange: (color: string) => void;
  usedColors?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {MEMBER_COLORS.map((color) => {
        const isUsed = usedColors.includes(color) && color !== value;
        return (
          <button
            key={color}
            type="button"
            title={MEMBER_COLOR_NAMES[color]}
            onClick={() => onChange(color)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${
              isUsed ? "opacity-30 cursor-not-allowed" : "hover:scale-110 cursor-pointer"
            } ${value === color ? "ring-2 ring-offset-2 ring-gray-700 scale-110" : ""}`}
            style={{ backgroundColor: color }}
            disabled={isUsed}
          >
            {value === color && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

export default function MembersPanel({ open, onClose, project, onRefresh }: Props) {
  const addMemberMutation = trpc.members.add.useMutation({ onSuccess: () => onRefresh?.() });
  const updateMemberMutation = trpc.members.update.useMutation({ onSuccess: () => onRefresh?.() });
  const deleteMemberMutation = trpc.members.delete.useMutation({ onSuccess: () => onRefresh?.() });

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [error, setError] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  // 새 멤버 추가 시 자동으로 겹치지 않는 색상 배정
  const usedColors = project.members.map((m) => m.color);
  const [selectedColor, setSelectedColor] = useState(() =>
    getNextMemberColor(usedColors)
  );

  // 멤버 목록 변경 시 selectedColor 자동 업데이트
  useEffect(() => {
    setSelectedColor(getNextMemberColor(project.members.map((m) => m.color)));
  }, [project.members.length]);

  const handleAdd = () => {
    if (!newName.trim()) {
      setError("이름을 입력해주세요");
      return;
    }
    if (project.members.some((m) => m.name === newName.trim())) {
      setError("이미 있는 이름입니다");
      return;
    }
    addMemberMutation.mutate({
      projectId: project.id,
      name: newName.trim(),
      color: selectedColor,
    });
    setNewName("");
    setError("");
    setShowColorPicker(false);
  };

  const handleEdit = (id: string) => {
    if (!editName.trim()) return;
    updateMemberMutation.mutate({ id, name: editName.trim(), color: editColor });
    setEditingId(null);
    setEditName("");
  };

  const handleRemove = (id: string) => {
    const member = project.members.find((m) => m.id === id);
    if (member?.isMe) return;
    deleteMemberMutation.mutate({ id });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0">
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="bg-indigo-600 px-5 pt-5 pb-4">
            <SheetHeader>
              <SheetTitle className="text-white text-lg font-bold">
                여행 멤버
              </SheetTitle>
            </SheetHeader>
            <p className="text-indigo-200 text-sm mt-1">
              {project.members.length}명이 함께 여행 중
            </p>
            {/* 멤버 색상 미리보기 */}
            <div className="flex gap-1.5 mt-3">
              {project.members.map((m) => (
                <div
                  key={m.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/30"
                  style={{ backgroundColor: m.color }}
                  title={m.name}
                >
                  {m.name[0]}
                </div>
              ))}
            </div>
          </div>

          {/* 멤버 목록 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {project.members.map((member) => {
              const isEditing = editingId === member.id;
              const memberExpenses = project.expenses.filter(
                (e) => e.payerId === member.id
              );
              const totalPaid = memberExpenses.reduce(
                (s, e) => s + e.amount,
                0
              );

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4"
                  style={{ borderLeftWidth: 4, borderLeftColor: member.color }}
                >
                  <div className="flex items-center gap-3">
                    {/* 아바타 */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.name[0]}
                    </div>

                    {/* 이름 */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEdit(member.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-8 text-sm rounded-lg"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleEdit(member.id)}
                              className="h-8 text-white rounded-lg px-3"
                              style={{ backgroundColor: editColor }}
                            >
                              저장
                            </Button>
                          </div>
                          {/* 색상 변경 */}
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                              <Palette className="w-3 h-3" />
                              색상 변경
                            </p>
                            <ColorPicker
                              value={editColor}
                              onChange={setEditColor}
                              usedColors={usedColors.filter(c => c !== member.color)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 text-sm">
                              {member.name}
                            </span>
                            {member.isMe && (
                              <span className="flex items-center gap-0.5 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full font-medium">
                                <Crown className="w-2.5 h-2.5" />
                                나
                              </span>
                            )}
                            {/* 색상 뱃지 */}
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                              style={{ backgroundColor: member.color }}
                            >
                              {MEMBER_COLOR_NAMES[member.color] ?? ""}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            총 {totalPaid.toLocaleString()}원 결제
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    {!isEditing && !member.isMe && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingId(member.id);
                            setEditName(member.name);
                            setEditColor(member.color);
                          }}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                          title="이름/색상 변경"
                        >
                          <span className="text-xs">✏️</span>
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                          title="멤버 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 멤버 추가 */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              친구 추가
            </p>
            <div className="flex gap-2">
              {/* 색상 미리보기 버튼 */}
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm border-2 border-white hover:scale-105 transition-transform"
                style={{ backgroundColor: selectedColor }}
                title="색상 선택"
              >
                {newName ? newName[0] : <Palette className="w-4 h-4" />}
              </button>
              <div className="flex-1">
                <Input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  placeholder="친구 이름 입력"
                  className={`rounded-xl border-gray-200 ${error ? "border-red-400" : ""}`}
                />
                {error && (
                  <p className="text-xs text-red-500 mt-1">{error}</p>
                )}
              </div>
              <Button
                onClick={handleAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* 색상 선택 팔레트 (토글) */}
            {showColorPicker && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  색상 선택 (자동 배정됨, 변경 가능)
                </p>
                <ColorPicker
                  value={selectedColor}
                  onChange={setSelectedColor}
                  usedColors={usedColors}
                />
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
