// 나라 이름으로 검색해서 여행 통화를 고르는 셀렉트박스
// "기타"를 고르면 목록에 없는 통화 코드를 직접 입력할 수 있다 (isOther/onSelectOther는 부모가 관리)
// Popover(플로팅) 대신 인라인으로 펼치는 방식 - 모달 안에서 겹치거나 스크롤이 막히는 문제를 피하기 위함

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { TRIP_CURRENCY_OPTIONS } from "@/lib/currencies";

interface Props {
  value: string; // 통화 코드 (예: "JPY")
  onChange: (code: string) => void;
  isOther: boolean; // "기타" 선택 여부 (직접 입력 모드)
  onSelectOther: () => void;
  error?: string;
}

export default function CurrencyCombobox({ value, onChange, isOther, onSelectOther, error }: Props) {
  const [open, setOpen] = useState(false);

  const selected = TRIP_CURRENCY_OPTIONS.find((c) => c.code === value);
  const triggerLabel = isOther
    ? "기타 (직접 입력)"
    : selected
      ? `${selected.country} (${selected.symbol})`
      : "국가 선택";

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className={`w-full justify-between rounded-xl border-gray-200 font-normal ${error ? "border-red-400" : ""}`}
      >
        {triggerLabel}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <Command>
            <CommandInput placeholder="나라 이름 검색..." />
            <CommandList className="max-h-[240px] overflow-y-auto overscroll-contain">
              <CommandEmpty>검색 결과가 없어요</CommandEmpty>
              <CommandGroup>
                {TRIP_CURRENCY_OPTIONS.map((c, idx) => (
                  <CommandItem
                    key={`${c.code}-${idx}`}
                    value={c.country}
                    onSelect={() => {
                      onChange(c.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={!isOther && value === c.code ? "opacity-100" : "opacity-0"} />
                    {c.country} {c.code !== "KRW" && `(${c.symbol})`}
                  </CommandItem>
                ))}
                <CommandItem
                  value="기타"
                  onSelect={() => {
                    onSelectOther();
                    setOpen(false);
                  }}
                >
                  <Check className={isOther ? "opacity-100" : "opacity-0"} />
                  기타 (통화 코드 직접 입력)
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
      {isOther && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="통화 코드 3자리 (예: MYR)"
          className={`rounded-xl border-gray-200 ${error ? "border-red-400" : ""}`}
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
