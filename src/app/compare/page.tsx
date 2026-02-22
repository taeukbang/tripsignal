"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { DurationSlider } from "@/components/DurationSlider";
import { CityComparisonChart } from "@/components/CityComparisonChart";
import { Logo } from "@/components/ui/Logo";
import { formatPrice } from "@/lib/utils";
import type { CityCostSummary, Duration } from "@/types";
import { DEFAULT_DURATION, DURATIONS } from "@/types";

const CONTINENT_LABELS: Record<string, string> = {
  "east-asia": "동아시아",
  "southeast-asia": "동남아",
  "europe": "유럽",
  "americas": "미주",
};

export default function ComparePage() {
  const router = useRouter();
  const [duration, setDuration] = useState<Duration>(DEFAULT_DURATION);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const params = new URLSearchParams(window.location.search);
    const durRaw = Number(params.get("duration"));
    if (DURATIONS.includes(durRaw as Duration)) {
      setDuration(durRaw as Duration);
    }
  }, []);
  const [summaries, setSummaries] = useState<CityCostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterContinent, setFilterContinent] = useState<string>("all");

  useEffect(() => {
    const controller = new AbortController();
    setSummaries([]);
    setLoading(true);
    setError(null);
    fetch(`/api/compare?duration=${duration}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setSummaries(json.data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        setError("비교 데이터를 불러오지 못했습니다");
        setLoading(false);
      });
    return () => controller.abort();
  }, [duration]);

  const handleDurationChange = useCallback((d: Duration) => {
    setDuration(d);
  }, []);

  const handleCityClick = useCallback(
    (cityId: string) => {
      router.push(`/?city=${cityId}&duration=${duration}`);
    },
    [router, duration],
  );

  const filtered = filterContinent === "all"
    ? summaries
    : summaries.filter((s) => s.continentId === filterContinent);

  const cheapest = filtered.length > 0 ? filtered[0] : null;
  const mostExpensive = filtered.length > 0 ? filtered[filtered.length - 1] : null;

  const continents = Array.from(new Set(summaries.map((s) => s.continentId)));

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
              aria-label="메인으로 돌아가기"
            >
              ← 돌아가기
            </button>
          </div>
          <div className="text-center mt-3">
            <div className="flex items-center justify-center gap-2">
              <Logo size={26} />
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                도시별 <span className="text-blue-600">비용 비교</span>
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {duration}일 여정 기준 · 1인당 최저가 순위
            </p>
          </div>
        </header>

        {/* Duration Slider */}
        <section className="card-panel rounded-2xl p-4 mb-3">
          <DurationSlider value={duration} onChange={handleDurationChange} />
        </section>

        {/* Continent Filter */}
        {!loading && summaries.length > 0 && (
          <section className="mb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 w-max min-w-full">
              <button
                onClick={() => setFilterContinent("all")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  filterContinent === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                전체 {summaries.length}
              </button>
              {continents.map((cid) => {
                const count = summaries.filter((s) => s.continentId === cid).length;
                return (
                  <button
                    key={cid}
                    onClick={() => setFilterContinent(cid)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      filterContinent === cid
                        ? "bg-gray-800 text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {CONTINENT_LABELS[cid] ?? cid} {count}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Summary Stats */}
        {!loading && filtered.length > 0 && cheapest && mostExpensive && (
          <section className="card-panel rounded-2xl p-4 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">
                  가장 저렴한 도시
                </div>
                <div className="text-xl font-extrabold text-blue-600">
                  {cheapest.nameKo}
                </div>
                <div className="text-sm font-bold text-blue-600">
                  {formatPrice(cheapest.minPerPersonCost)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {cheapest.countryKo}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">
                  가장 비싼 도시
                </div>
                <div className="text-lg font-bold text-gray-400">
                  {mostExpensive.nameKo}
                </div>
                <div className="text-sm font-bold text-gray-400">
                  {formatPrice(mostExpensive.minPerPersonCost)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {mostExpensive.countryKo}
                </div>
              </div>
            </div>
            {cheapest.minPerPersonCost < mostExpensive.minPerPersonCost && (
              <div className="text-xs text-green-600 font-semibold mt-2 text-center">
                최대 {formatPrice(mostExpensive.minPerPersonCost - cheapest.minPerPersonCost)} 차이
              </div>
            )}
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400 mt-4">
              전체 도시 가격을 비교하고 있어요
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <section className="card-panel rounded-2xl text-center py-12 px-6">
            <p className="text-sm text-red-500 font-medium">{error}</p>
            <p className="text-xs text-gray-400 mt-1.5">
              잠시 후 다시 시도해주세요
            </p>
          </section>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <section className="card-panel rounded-2xl text-center py-16 px-6">
            <p className="text-3xl mb-3">📊</p>
            <p className="text-sm font-medium text-gray-600">
              비교할 수 있는 데이터가 아직 없습니다
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              가격 데이터 수집 후 확인해주세요
            </p>
          </section>
        )}

        {/* Chart */}
        {!loading && !error && filtered.length > 0 && (
          <section className="card-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-400">
                1인당 최저가 기준 · 도시를 탭하면 상세 보기
              </span>
            </div>
            <CityComparisonChart
              summaries={filtered}
              onCityClick={handleCityClick}
            />
          </section>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-gray-300">
            예상 비용이며, 실제 예약가와 다를 수 있습니다
          </p>
        </div>
      </div>
    </main>
  );
}
