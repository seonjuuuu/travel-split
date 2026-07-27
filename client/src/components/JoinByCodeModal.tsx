// 초대 코드(또는 초대 링크)를 입력해서 여행에 참여하는 모달
import { useState } from "react";
import { useLocation } from "wouter";
import { KeyRound, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
}

// 친구가 링크 전체("https://.../join/abc123")를 보내든, 코드("abc123")만 보내든
// 둘 다 인식할 수 있도록 토큰만 추출한다.
function extractToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/join\/([^/?#]+)/);
  if (match) return match[1];
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? trimmed;
}

export default function JoinByCodeModal({ open, onClose }: Props) {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleClose = () => {
    setCode("");
    setError("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(code);
    if (!token) {
      setError("초대 코드를 입력해주세요");
      return;
    }
    handleClose();
    navigate(`/join/${token}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <div className="bg-indigo-600 px-6 pt-6 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-5 h-5 text-indigo-200" />
            <span className="text-indigo-200 text-sm font-medium">초대 코드로 참여</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              초대받은 여행이 있나요?
            </DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
              초대 코드 또는 링크
            </Label>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="친구에게 받은 코드나 링크를 붙여넣으세요"
              className={`rounded-xl border-gray-200 ${error ? "border-red-400" : ""}`}
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1 rounded-xl border-gray-200 text-gray-600">
              취소
            </Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium">
              참여하기
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
