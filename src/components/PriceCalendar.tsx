"use client";

import { useMemo, useState } from "react";
import type { TripCost, PriceLabel } from "@/types";
import { createPriceLabeler } from "@/lib/price-calculator";
import { CalendarCell } from "@/components/ui/CalendarCell";
import { formatDate } from "@/lib/utils";

interface PriceCalendarProps {
  costs: TripCost[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

interface MonthData {
  year: number;
  month: number;
  label: string;
  days: Array<{
    date: string;
    dayOfMonth: number;
    trip: TripCost | null;
    label: PriceLabel;
    isLowest: boolean;
    isPast: boolean;
  }>;
  startDayOfWeek: number;
  dataCount: number;
}

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

export function PriceCalendar({ costs, selectedDate, onSelectDate }: PriceCalendarProps) {
  const [monthIdx, setMonthIdx] = useState(0);

  const { months, todayStr } = useMemo(() => {
    const todayStr = formatDate(new Date());

    if (costs.length === 0) return { months: [] as MonthData[], todayStr };

    const allPrices = costs.map((c) => c.perPersonCost);
    const minCost = Math.min(...allPrices);
    const getLabel = createPriceLabeler(allPrices);

    const costMap = new Map<string, TripCost>();
    for (const c of costs) {
      costMap.set(c.departureDate, c);
    }

    const monthMap = new Map<string, MonthData>();

    const firstDate = new Date(costs[0].departureDate);
    const lastDate = new Date(costs[costs.length - 1].departureDate);

    const current = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0);

    while (current <= endMonth) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const key = `${year}-${month}`;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDayOfWeek = new Date(year, month, 1).getDay();

      const days: MonthData["days"] = [];
      let dataCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const trip = costMap.get(dateStr) ?? null;
        const label: PriceLabel = trip ? getLabel(trip.perPersonCost) : "normal";
        const isLowest = trip ? trip.perPersonCost === minCost : false;
        const isPast = dateStr < todayStr;

        if (trip) dataCount++;
        days.push({ date: dateStr, dayOfMonth: d, trip, label, isLowest, isPast });
      }

      monthMap.set(key, {
        year,
        month: month + 1,
        label: `${year}년 ${month + 1}월`,
        days,
        startDayOfWeek,
        dataCount,
      });

      current.setMonth(current.getMonth() + 1);
    }

    return { months: Array.from(monthMap.values()), todayStr };
  }, [costs]);

  if (months.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        데이터를 불러오는 중...
      </div>
    );
  }

  const safeIdx = Math.max(0, Math.min(monthIdx, months.length - 1));
  const currentMonth = months[safeIdx];

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
          disabled={safeIdx === 0}
          aria-label="이전 달"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-20 transition"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <h3 className="text-base font-bold text-gray-900">
          {currentMonth.label}
          {currentMonth.dataCount > 0 && (
            <span className="text-[10px] font-normal text-gray-400 ml-1.5">
              {currentMonth.dataCount}일 데이터
            </span>
          )}
        </h3>

        <button
          onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
          disabled={safeIdx === months.length - 1}
          aria-label="다음 달"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-20 transition"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((dh, i) => (
          <div
            key={dh}
            className={`text-center text-[11px] font-medium pb-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}
          >
            {dh}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: currentMonth.startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {currentMonth.days.map((day) => (
          <CalendarCell
            key={day.date}
            date={day.date}
            dayOfMonth={day.dayOfMonth}
            trip={day.trip}
            label={day.label}
            isLowest={day.isLowest}
            isSelected={selectedDate === day.date}
            isToday={day.date === todayStr}
            isPast={day.isPast}
            onClick={onSelectDate}
          />
        ))}
      </div>

      {/* Month indicator dots */}
      <div className="flex justify-center gap-1 mt-4">
        {months.map((m, i) => (
          <button
            key={`${m.year}-${m.month}`}
            onClick={() => setMonthIdx(i)}
            aria-label={`${m.year}년 ${m.month}월로 이동`}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === safeIdx ? "bg-blue-600 w-4" : "bg-gray-300 hover:bg-gray-400"}`}
          />
        ))}
      </div>
    </div>
  );
}
