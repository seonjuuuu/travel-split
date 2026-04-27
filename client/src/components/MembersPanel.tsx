// 멤버 관리 패널 (Sheet/Drawer)
// Design: Clean member list with avatar system

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { TravelProject } from "@/lib/types";
import { Plus, Trash2, Crown, UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  project: TravelProject;
  onRefresh?: () => void;
}

export default function MembersPanel({ open, onClose, project, onRefresh }: Props) {
  const addMemberMutation = trpc.members.add.useMutation({ onSuccess: () => onRefresh?.() });
  const updateMemberMutation = trpc.members.update.useMutation({ onSuccess: () => onRefresh?.() });
  const deleteMemberMutation = trpc.members.delete.useMutation({ onSuccess: () => onRefresh?.() });
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [editColor, setEditColor] = useState("#6366f1");

  const handleAdd = () => {
    if (!newName.trim()) {
      setError("이름을 입력해주세요");
      return;
    }
    if (project.members.some((m) => m.name === newName.trim())) {
      setError("이미 있는 이름입니다");
      return;
    }
    addMemberMutation.mutate({ projectId: project.id, name: newName.trim(), color: selectedColor ?? "#6366f1" });
    setNewName("");
    setError("");
  };

  const handleEdit = (id: string) => {
    if (!editName.trim()) return;
    updateMemberMutation.mutate({ id, name: editName.trim(), color: editColor ?? "#6366f1" });
    setEditingId(null);
    setEditName("");
  };

  const handleRemove = (id: string) => {
    const member = project.members.find((m) => m.id === id);
    if (member?.isMe) return; // 나는 삭제 불가
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
                >
                  <div className="flex items-center gap-3">
                    {/* 아바타 */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.name[0]}
                    </div>

                    {/* 이름 */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
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
                            className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3"
                          >
                            저장
                          </Button>
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
                          }}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                        >
                          <span className="text-xs">✏️</span>
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
