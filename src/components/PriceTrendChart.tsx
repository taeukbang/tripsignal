"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { TripCost } from "@/types";
import { formatPrice, formatPriceWon, getDayOfWeek, addDays } from "@/lib/utils";

interface PriceTrendChartProps {
  costs: TripCost[];
  avgCost: number;
  onSelectDate: (date: string) => void;
}

const SVG_W = 480;
const SVG_H = 160;
const PAD = { top: 24, right: 16, bottom: 32, left: 16 };

export function PriceTrendChart({ costs, avgCost, onSelectDate }: PriceTrendChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(() => {
    if (costs.length < 3) return null;

    const prices = costs.map((c) => c.perPersonCost);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const drawW = SVG_W - PAD.left - PAD.right;
    const drawH = SVG_H - PAD.top - PAD.bottom;

    const pts = costs.map((c, i) => {
      const x = PAD.left + (i / (costs.length - 1)) * drawW;
      const y = PAD.top + drawH - ((c.perPersonCost - min) / range) * drawH;
      return { x, y, cost: c };
    });

    const avgY = PAD.top + drawH - ((avgCost - min) / range) * drawH;
    const minIdx = prices.indexOf(min);
    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${pts[0].x},${SVG_H - PAD.bottom} ${line} ${pts[pts.length - 1].x},${SVG_H - PAD.bottom}`;

    const months: Array<{ label: string; x: number }> = [];
    let lastM = -1;
    pts.forEach((p) => {
      const m = new Date(p.cost.departureDate).getMonth();
      if (m !== lastM) {
        lastM = m;
        months.push({ label: `${m + 1}월`, x: p.x });
      }
    });

    return { pts, avgY, minIdx, line, area, months };
  }, [costs, avgCost]);

  const getIdxFromEvent = useCallback(
    (clientX: number) => {
      if (!svgRef.current || !chart) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const relX = (clientX - rect.left) / rect.width;
      const idx = Math.round(relX * (costs.length - 1));
      return Math.max(0, Math.min(costs.length - 1, idx));
    },
    [chart, costs.length],
  );

  if (!chart) return null;

  const hp = hoverIdx !== null ? chart.pts[hoverIdx] : null;

  const formatTooltipDate = (cost: TripCost) => {
    const d = new Date(cost.departureDate);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dow = getDayOfWeek(cost.departureDate);
    const retDate = addDays(cost.departureDate, cost.duration - 1);
    const rd = new Date(retDate);
    const rm = String(rd.getMonth() + 1).padStart(2, "0");
    const rday = String(rd.getDate()).padStart(2, "0");
    const rdow = getDayOfWeek(retDate);
    return `${m}.${day} (${dow}) - ${rm}.${rday} (${rdow})`;
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: 160 }}
        onMouseMove={(e) => setHoverIdx(getIdxFromEvent(e.clientX))}
        onMouseLeave={() => setHoverIdx(null)}
        onClick={(e) => {
          const idx = getIdxFromEvent(e.clientX);
          if (idx !== null) onSelectDate(costs[idx].departureDate);
        }}
        onTouchMove={(e) => setHoverIdx(getIdxFromEvent(e.touches[0].clientX))}
        onTouchEnd={() => {
          if (hp) onSelectDate(hp.cost.departureDate);
          setHoverIdx(null);
        }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <polygon points={chart.area} fill="url(#areaGrad)" />

        <line
          x1={PAD.left} y1={chart.avgY}
          x2={SVG_W - PAD.right} y2={chart.avgY}
          stroke="#D1D5DB" strokeWidth="1" strokeDasharray="6,4"
        />
        <text
          x={SVG_W - PAD.right} y={chart.avgY - 6}
          textAnchor="end" fontSize="11" fill="#9CA3AF" fontFamily="Pretendard, sans-serif"
        >
          평균 {formatPrice(avgCost)}
        </text>

        <polyline
          points={chart.line}
          fill="none" stroke="#2563EB" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />

        <circle
          cx={chart.pts[chart.minIdx].x} cy={chart.pts[chart.minIdx].y}
          r="4" fill="#EC4937" stroke="#fff" strokeWidth="2"
        />
        {hoverIdx === null && (
          <text
            x={chart.pts[chart.minIdx].x} y={chart.pts[chart.minIdx].y + 14}
            textAnchor="middle" fontSize="10" fontWeight="700" fill="#EC4937"
            fontFamily="Pretendard, sans-serif"
          >
            최저가 {formatPriceWon(chart.pts[chart.minIdx].cost.perPersonCost)}
          </text>
        )}

        {hp && (
          <>
            <line
              x1={hp.x} y1={PAD.top} x2={hp.x} y2={SVG_H - PAD.bottom}
              stroke="#374151" strokeWidth="1" opacity="0.3"
            />
            <circle cx={hp.x} cy={hp.y} r="4" fill="#374151" stroke="#fff" strokeWidth="2" />
          </>
        )}

        {chart.months.map((m) => (
          <text
            key={m.label}
            x={m.x} y={SVG_H - 10}
            fontSize="11" fill="#9CA3AF" fontFamily="Pretendard, sans-serif"
          >
            {m.label}
          </text>
        ))}
      </svg>

      {/* HTML tooltip overlay */}
      {hp && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${(hp.x / SVG_W) * 100}%`,
            top: `${(hp.y / SVG_H) * 100}%`,
            transform: "translate(-50%, -120%)",
          }}
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-center whitespace-nowrap">
            <div className="text-[11px] text-gray-500">
              {formatTooltipDate(hp.cost)}
            </div>
            <div className="text-sm font-bold text-blue-600">
              {formatPriceWon(hp.cost.perPersonCost)}~
            </div>
          </div>
          <div className="w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
