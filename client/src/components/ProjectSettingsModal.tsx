// 프로젝트 설정 모달
// Design: Clean settings form

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import type { TravelProject } from "@/lib/types";
import { Settings, MapPin, Calendar, Plane } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  project: TravelProject;
  onRefresh?: () => void;
}

export default function ProjectSettingsModal({ open, onClose, project, onRefresh }: Props) {
  const utils = trpc.useUtils();
  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: project.id });
      onRefresh?.();
      onClose();
    },
  });
  const [form, setForm] = useState({
    name: project.name,
    destination: project.destination,
    startDate: project.startDate,
    endDate: project.endDate,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({
        name: project.name,
        destination: project.destination,
        startDate: project.startDate,
        endDate: project.endDate,
      });
      setErrors({});
    }
  }, [open, project]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "여행 이름을 입력해주세요";
    if (!form.destination.trim()) errs.destination = "여행지를 입력해주세요";
    if (!form.startDate) errs.startDate = "시작일을 선택해주세요";
    if (!form.endDate) errs.endDate = "종료일을 선택해주세요";
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      errs.endDate = "종료일은 시작일 이후여야 합니다";
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    updateProjectMutation.mutate({ id: project.id, ...form });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <div className="bg-gray-900 px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">프로젝트 설정</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              여행 정보 수정
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 min-w-0">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-indigo-500" />
              여행 이름
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`rounded-xl border-gray-200 ${errors.name ? "border-red-400" : ""}`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              여행지
            </Label>
            <Input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className={`rounded-xl border-gray-200 ${errors.destination ? "border-red-400" : ""}`}
            />
            {errors.destination && (
              <p className="text-xs text-red-500">{errors.destination}</p>
            )}
          </div>

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
                className={`rounded-xl border-gray-200 ${errors.startDate ? "border-red-400" : ""}`}
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
                className={`rounded-xl border-gray-200 ${errors.endDate ? "border-red-400" : ""}`}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl border-gray-200 text-gray-600"
            >
              취소
            </Button>
            <Button
              type="submit"
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
