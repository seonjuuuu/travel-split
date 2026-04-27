// 여행 프로젝트 생성 모달
// Design: Clean form with indigo accents

import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import { MapPin, Calendar, User, Plane } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: Props) {
  const [, navigate] = useLocation();
  const { createProject } = useApp();
  const [form, setForm] = useState({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    myName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "여행 이름을 입력해주세요";
    if (!form.destination.trim()) errs.destination = "여행지를 입력해주세요";
    if (!form.startDate) errs.startDate = "시작일을 선택해주세요";
    if (!form.endDate) errs.endDate = "종료일을 선택해주세요";
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      errs.endDate = "종료일은 시작일 이후여야 합니다";
    if (!form.myName.trim()) errs.myName = "내 이름을 입력해주세요";
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const project = createProject(form);
    setForm({ name: "", destination: "", startDate: "", endDate: "", myName: "" });
    setErrors({});
    onClose();
    navigate(`/project/${project.id}`);
  };

  const handleClose = () => {
    setForm({ name: "", destination: "", startDate: "", endDate: "", myName: "" });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        {/* 상단 헤더 */}
        <div className="bg-indigo-600 px-6 pt-6 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="w-5 h-5 text-indigo-200" />
            <span className="text-indigo-200 text-sm font-medium">새 여행 프로젝트</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              어디로 떠나시나요?
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* 내 이름 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              내 이름
            </Label>
            <Input
              value={form.myName}
              onChange={(e) => setForm({ ...form, myName: e.target.value })}
              placeholder="홍길동"
              className={`rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400 ${errors.myName ? "border-red-400" : ""}`}
            />
            {errors.myName && (
              <p className="text-xs text-red-500">{errors.myName}</p>
            )}
          </div>

          {/* 여행 이름 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-indigo-500" />
              여행 이름
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="오사카 봄 여행"
              className={`rounded-xl border-gray-200 focus:border-indigo-400 ${errors.name ? "border-red-400" : ""}`}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* 여행지 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              여행지
            </Label>
            <Input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="일본 오사카"
              className={`rounded-xl border-gray-200 focus:border-indigo-400 ${errors.destination ? "border-red-400" : ""}`}
            />
            {errors.destination && (
              <p className="text-xs text-red-500">{errors.destination}</p>
            )}
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                시작일
              </Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={`rounded-xl border-gray-200 focus:border-indigo-400 ${errors.startDate ? "border-red-400" : ""}`}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500">{errors.startDate}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                종료일
              </Label>
              <Input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={`rounded-xl border-gray-200 focus:border-indigo-400 ${errors.endDate ? "border-red-400" : ""}`}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-xl border-gray-200 text-gray-600"
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
            >
              여행 시작하기
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
