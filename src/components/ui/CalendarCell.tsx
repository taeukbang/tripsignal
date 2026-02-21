"use client";

import { memo } from "react";
import type { TripCost, PriceLabel } from "@/types";
import { formatPrice } from "@/lib/utils";

interface CalendarCellProps {
  date: string;
  dayOfMonth: number;
  trip: TripCost | null;
  label: PriceLabel;
  isLowest: boolean;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  onClick: (date: string) => void;
}

const CELL_CLASS: Record<PriceLabel, string> = {
  lowest: "cell-lowest animate-pulse-signal",
  cheap: "cell-cheap",
  normal: "cell-normal",
  expensive: "cell-expensive",
  peak: "cell-peak",
};

const PRICE_COLOR: Record<PriceLabel, string> = {
  lowest: "text-blue-700",
  cheap: "text-blue-600",
  normal: "text-gray-700",
  expensive: "text-orange-600",
  peak: "text-red-500",
};

export const CalendarCell = memo(function CalendarCell({
  date,
  dayOfMonth,
  trip,
  label,
  isLowest,
  isSelected,
  isToday,
  isPast,
  onClick,
}: CalendarCellProps) {
  if (!trip) {
    return (
      <div className="relative min-h-[58px] rounded-lg flex flex-col items-center justify-center bg-gray-50/70">
        <span className={`text-[10px] ${isPast ? "text-gray-200" : "text-gray-300"}`}>
          {dayOfMonth}
        </span>
        {!isPast && (
          <span className="text-[8px] text-gray-300 mt-0.5">—</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onClick(date)}
      aria-label={`${date} 출발, 1인당 ${formatPrice(trip.perPersonCost)}`}
      className={`
        relative min-h-[58px] rounded-lg transition-all duration-150
        flex flex-col items-center justify-center gap-0.5
        hover:scale-[1.05] hover:shadow-md hover:z-10 active:scale-[0.97]
        ${CELL_CLASS[label]}
        ${isSelected ? "ring-2 ring-blue-600 ring-offset-1 shadow-md" : ""}
      `}
    >
      {isLowest && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
          최저가
        </span>
      )}
      {isToday && (
        <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
      )}
      <span className="text-[10px] font-medium text-gray-400">{dayOfMonth}</span>
      <span className={`text-[11px] font-bold ${PRICE_COLOR[label]}`}>
        {formatPrice(trip.perPersonCost)}
      </span>
    </button>
  );
});
