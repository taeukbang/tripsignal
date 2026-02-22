"use client";

import { useMemo } from "react";
import type { CityCostSummary } from "@/types";
import { formatPrice, formatShortDate } from "@/lib/utils";

interface CityComparisonChartProps {
  summaries: CityCostSummary[];
  onCityClick: (cityId: string) => void;
}

const CONTINENT_COLORS: Record<string, string> = {
  "east-asia": "#2563EB",
  "southeast-asia": "#059669",
  "europe": "#7C3AED",
  "americas": "#EA580C",
};

const BAR_HEIGHT = 36;
const BAR_GAP = 6;
const LABEL_WIDTH = 120;
const PRICE_WIDTH = 70;
const CHART_PAD = 8;

export function CityComparisonChart({ summaries, onCityClick }: CityComparisonChartProps) {
  const chart = useMemo(() => {
    if (summaries.length === 0) return null;

    const maxCost = Math.max(...summaries.map((s) => s.minPerPersonCost));
    const totalH = summaries.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP + CHART_PAD * 2;

    return { maxCost, totalH };
  }, [summaries]);

  if (!chart) return null;

  return (
    <div className="space-y-1">
      {summaries.map((s, i) => {
        const barWidth = (s.minPerPersonCost / chart.maxCost) * 100;
        const color = CONTINENT_COLORS[s.continentId] ?? "#6B7280";
        const rank = i + 1;

        return (
          <button
            key={s.cityId}
            onClick={() => onCityClick(s.cityId)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition text-left group"
          >
            <span className="text-[11px] font-medium text-gray-400 w-5 text-right shrink-0">
              {rank}
            </span>

            <div className="shrink-0 w-[100px]">
              <div className="text-sm font-semibold text-gray-800 leading-tight">
                {s.nameKo}
              </div>
              <div className="text-[10px] text-gray-400 leading-tight">
                {s.countryKo}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="relative h-5">
                <div
                  className="absolute inset-y-0 left-0 rounded-r-md transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(barWidth, 3)}%`,
                    backgroundColor: color,
                    opacity: 0.75,
                  }}
                />
              </div>
            </div>

            <div className="shrink-0 text-right w-[72px]">
              <div className="text-sm font-bold" style={{ color }}>
                {formatPrice(s.minPerPersonCost)}
              </div>
              <div className="text-[9px] text-gray-400 leading-tight">
                {formatShortDate(s.cheapestDate)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
