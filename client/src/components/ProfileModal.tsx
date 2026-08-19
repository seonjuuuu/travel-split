// 내 프로필 모달 - 로그인 이메일 확인 + 닉네임 변경
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Mail, User } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  user: { email: string; name: string | null } | null | undefined;
}

export default function ProfileModal({ open, onClose, user }: Props) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const updateNameMutation = trpc.auth.updateName.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("닉네임이 변경되었습니다!");
      onClose();
    },
    onError: () => toast.error("닉네임 변경에 실패했습니다"),
  });

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setError("");
    }
  }, [open, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("닉네임을 입력해주세요");
      return;
    }
    updateNameMutation.mutate({ name: name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden">
        <div className="bg-indigo-600 px-6 pt-6 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-indigo-200" />
            <span className="text-indigo-200 text-sm font-medium">내 프로필</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">계정 정보</DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              로그인 이메일
            </Label>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-500">
              {user?.email}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              닉네임
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="닉네임을 입력해주세요"
              className={`rounded-xl border-gray-200 ${error ? "border-red-400" : ""}`}
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl border-gray-200 text-gray-600">
              취소
            </Button>
            <Button
              type="submit"
              disabled={updateNameMutation.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
            >
              저장
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
