// 할일(요청사항) 패널 - 담당자 지정 가능한 체크리스트
import { useState } from "react";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { TravelProject } from "@/lib/types";

interface Props {
  project: TravelProject;
}

export default function TodoPanel({ project }: Props) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const invalidate = () => utils.projects.get.invalidate({ id: project.id });

  const addMutation = trpc.todos.add.useMutation({ onSuccess: invalidate });

  const toggleMutation = trpc.todos.update.useMutation({
    onMutate: async (vars) => {
      await utils.projects.get.cancel({ id: project.id });
      const prev = utils.projects.get.getData({ id: project.id });
      utils.projects.get.setData({ id: project.id }, (old) => {
        if (!old) return old;
        return {
          ...old,
          todos: old.todos.map((t) =>
            t.id === vars.id ? { ...t, isDone: vars.isDone ?? t.isDone } : t
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.projects.get.setData({ id: project.id }, ctx.prev);
    },
    onSettled: invalidate,
  });

  const deleteMutation = trpc.todos.delete.useMutation({
    onMutate: async (vars) => {
      await utils.projects.get.cancel({ id: project.id });
      const prev = utils.projects.get.getData({ id: project.id });
      utils.projects.get.setData({ id: project.id }, (old) => {
        if (!old) return old;
        return { ...old, todos: old.todos.filter((t) => t.id !== vars.id) };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.projects.get.setData({ id: project.id }, ctx.prev);
    },
    onSettled: invalidate,
  });

  const handleAdd = () => {
    if (!title.trim()) return;
    addMutation.mutate({
      projectId: project.id,
      title: title.trim(),
      assigneeIds,
    });
    setTitle("");
    setAssigneeIds([]);
  };

  const todos = [...project.todos].sort((a, b) => Number(a.isDone) - Number(b.isDone));
  const pendingCount = project.todos.filter((t) => !t.isDone).length;

  return (
    <div>
      {/* 할일 추가 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <ListTodo className="w-4 h-4 text-indigo-500" />
          할일 추가
        </p>
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="예: 비행기 티켓 예약해줘"
            className="rounded-xl border-gray-200 flex-1"
          />
          <Button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {project.members.map((m) => {
            const selected = assigneeIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAssignee(m.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  selected ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
                style={selected ? { backgroundColor: m.color } : {}}
              >
                {m.name}
              </button>
            );
          })}
        </div>
        {assigneeIds.length === 0 && (
          <p className="text-xs text-gray-400 mt-1.5">담당자를 안 고르면 전체 공용 할일이 돼요 (여러 명 선택 가능)</p>
        )}
      </div>

      {todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ListTodo className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">아직 할일이 없어요</p>
          <p className="text-sm text-gray-400">예약이나 준비물처럼 서로 부탁할 일을 남겨보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingCount > 0 && (
            <p className="text-xs text-gray-400 px-1">{pendingCount}개 남음</p>
          )}
          {todos.map((todo) => {
            const assignees = project.members.filter((m) => todo.assigneeIds.includes(m.id));
            return (
              <div
                key={todo.id}
                className={`bg-white rounded-2xl border border-gray-100 p-3.5 flex items-center gap-3 ${
                  todo.isDone ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() =>
                    toggleMutation.mutate({ id: todo.id, isDone: !todo.isDone })
                  }
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                    todo.isDone
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-gray-300 hover:border-indigo-400"
                  }`}
                >
                  {todo.isDone && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium text-gray-900 truncate ${
                      todo.isDone ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {todo.title}
                  </p>
                </div>

                {assignees.length > 0 && (
                  <div className="flex -space-x-1.5 shrink-0">
                    {assignees.map((assignee) => (
                      <div
                        key={assignee.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white"
                        style={{ backgroundColor: assignee.color }}
                        title={assignee.name}
                      >
                        {assignee.name[0]}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => deleteMutation.mutate({ id: todo.id })}
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  title="할일 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
