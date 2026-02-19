"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { TripCost } from "@/types";
import { formatPrice } from "@/lib/utils";

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

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: 160 }}
        onMouseMove={(e) => setHoverIdx(getIdxFromEvent(e.clientX))}
        onMouseLeave={() => setHoverIdx(null)}
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

        {/* Area */}
        <polygon points={chart.area} fill="url(#areaGrad)" />

        {/* Avg line */}
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

        {/* Line */}
        <polyline
          points={chart.line}
          fill="none" stroke="#2563EB" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />

        {/* Min dot */}
        <circle
          cx={chart.pts[chart.minIdx].x} cy={chart.pts[chart.minIdx].y}
          r="4" fill="#2563EB" stroke="#fff" strokeWidth="2"
        />
        {hoverIdx === null && (
          <text
            x={chart.pts[chart.minIdx].x} y={chart.pts[chart.minIdx].y - 10}
            textAnchor="middle" fontSize="11" fontWeight="700" fill="#2563EB"
            fontFamily="Pretendard, sans-serif"
          >
            최저 {formatPrice(chart.pts[chart.minIdx].cost.perPersonCost)}
          </text>
        )}

        {/* Hover */}
        {hp && (
          <>
            <line
              x1={hp.x} y1={PAD.top} x2={hp.x} y2={SVG_H - PAD.bottom}
              stroke="#2563EB" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"
            />
            <circle cx={hp.x} cy={hp.y} r="5" fill="#2563EB" stroke="#fff" strokeWidth="2" />
            <rect
              x={hp.x - 48} y={hp.y - 30} width="96" height="22" rx="6"
              fill="#1F2937" opacity="0.9"
            />
            <text
              x={hp.x} y={hp.y - 15}
              textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff"
              fontFamily="Pretendard, sans-serif"
            >
              {new Date(hp.cost.departureDate).getMonth() + 1}/{new Date(hp.cost.departureDate).getDate()} · {formatPrice(hp.cost.perPersonCost)}
            </text>
          </>
        )}

        {/* Month labels */}
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
    </div>
  );
}
