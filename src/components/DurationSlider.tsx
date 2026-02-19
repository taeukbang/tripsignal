"use client";

import type { Duration } from "@/types";
import { MIN_DURATION, MAX_DURATION } from "@/types";

interface DurationSliderProps {
  value: Duration;
  onChange: (v: Duration) => void;
}

export function DurationSlider({ value, onChange }: DurationSliderProps) {
  const nights = value - 1;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">여정 길이</span>
        <span className="text-base font-bold text-gray-900">
          {nights}박 {value}일
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-400">{MIN_DURATION}일</span>
        <input
          type="range"
          min={MIN_DURATION}
          max={MAX_DURATION}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) as Duration)}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #2563EB 0%, #2563EB ${((value - MIN_DURATION) / (MAX_DURATION - MIN_DURATION)) * 100}%, #E5E7EB ${((value - MIN_DURATION) / (MAX_DURATION - MIN_DURATION)) * 100}%, #E5E7EB 100%)`,
          }}
        />
        <span className="text-[10px] text-gray-400">{MAX_DURATION}일</span>
      </div>
    </div>
  );
}
