"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { CitySelector } from "@/components/CitySelector";
import { DurationSlider } from "@/components/DurationSlider";
import { PriceTrendChart } from "@/components/PriceTrendChart";
import { PriceCalendar } from "@/components/PriceCalendar";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { HeatmapLegend } from "@/components/ui/HeatmapLegend";
import {
  calculateTripCosts,
  getPriceStats,
  createPriceLabeler,
} from "@/lib/price-calculator";
import { formatPrice, formatPriceWon, formatShortDate } from "@/lib/utils";
import type { City, Continent, PriceData, Duration } from "@/types";
import { DEFAULT_DURATION } from "@/types";
import { Logo } from "@/components/ui/Logo";
import { CONTINENTS } from "@/data/cities";

export default function HomePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [duration, setDuration] = useState<Duration>(DEFAULT_DURATION);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPricingInfo, setShowPricingInfo] = useState(false);

  useEffect(() => {
    fetch("/api/cities")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setCities(json.data);
        if (json.data.length > 0) setSelectedCity(json.data[0]);
      })
      .catch((err) => {
        console.error(err);
        setError("도시 목록을 불러오지 못했습니다");
      });
  }, []);

  useEffect(() => {
    if (!selectedCity) return;
    setLoading(true);
    setSelectedDate(null);
    setError(null);
    fetch(`/api/prices/${selectedCity.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setPriceData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("가격 데이터를 불러오지 못했습니다");
        setLoading(false);
      });
  }, [selectedCity]);

  const tripCosts = useMemo(() => {
    if (!priceData) return [];
    return calculateTripCosts(priceData.flights, priceData.hotels, duration);
  }, [priceData, duration]);

  const stats = useMemo(() => getPriceStats(tripCosts), [tripCosts]);

  const priceLabeler = useMemo(
    () => createPriceLabeler(tripCosts.map((c) => c.perPersonCost)),
    [tripCosts],
  );

  const selectedTrip = selectedDate
    ? tripCosts.find((c) => c.departureDate === selectedDate) ?? null
    : null;

  const selectedLabel = selectedTrip
    ? priceLabeler(selectedTrip.perPersonCost)
    : "normal";

  const handleSelectDate = useCallback((date: string) => setSelectedDate(date), []);
  const handleCloseBreakdown = useCallback(() => setSelectedDate(null), []);

  const showEmptyState = priceData === null && !loading && !error && cities.length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-5">
          <div className="flex items-center justify-center gap-2">
            <Logo size={30} />
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              My <span className="text-blue-600">TripSignal</span>
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            출발일별 여행 비용을 한눈에
          </p>
        </header>

        {/* Pricing info toggle */}
        <section className="mb-5">
          <button
            onClick={() => setShowPricingInfo((v) => !v)}
            className="w-full text-left text-[11px] text-gray-400 hover:text-gray-500 transition flex items-center gap-1"
          >
            <span>가격 산정 기준</span>
            <span className={`transition-transform ${showPricingInfo ? "rotate-90" : ""}`}>›</span>
          </button>
          {showPricingInfo && (
            <div className="card-panel rounded-xl p-3 mt-2 text-[11px] text-gray-500 leading-relaxed space-y-1">
              <p>• 마이리얼트립 직항 기준 왕복 항공 최저가 (2인)</p>
              <p>• 도심 4성급 숙소 1실 기준, 여정 박수에 따라 계산</p>
              <p>• 위 합산 금액을 1인당 비용으로 산출</p>
              <p className="text-gray-400 pt-1">
                ※ 실시간 변동 가능하여, 마이리얼트립 이동 시 다른 가격이 표시될 수 있습니다
              </p>
            </div>
          )}
        </section>

        {/* City Selector */}
        <section className="mb-5">
          <CitySelector
            continents={CONTINENTS}
            cities={cities}
            selected={selectedCity}
            onSelect={setSelectedCity}
          />
        </section>

        {/* Duration Slider */}
        <section className="card-panel rounded-2xl p-4 mb-3">
          <DurationSlider value={duration} onChange={setDuration} />
        </section>

        {/* Summary */}
        {stats.count > 0 && (
          <section className="card-panel rounded-2xl p-4 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">1인당 최저가</div>
                <div className="text-2xl font-extrabold text-blue-600">
                  {formatPrice(stats.minCost)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {stats.minDate && `${formatShortDate(stats.minDate)} 출발`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">평균</div>
                <div className="text-lg font-bold text-gray-400">
                  {formatPrice(stats.avgCost)}
                </div>
                {stats.avgCost > stats.minCost && (
                  <div className="text-xs text-green-600 font-semibold mt-0.5">
                    {formatPriceWon(stats.avgCost - stats.minCost)} 절약
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Chart */}
        {!loading && tripCosts.length > 3 && (
          <section className="card-panel rounded-2xl p-4 mb-3">
            <div className="text-[10px] text-gray-400 mb-2">출발일별 1인당 예상 비용 추이</div>
            <PriceTrendChart
              costs={tripCosts}
              avgCost={stats.avgCost}
              onSelectDate={handleSelectDate}
            />
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400 mt-4">가격 데이터를 불러오고 있어요</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <section className="card-panel rounded-2xl text-center py-12 px-6">
            <p className="text-sm text-red-500 font-medium">{error}</p>
            <p className="text-xs text-gray-400 mt-1.5">잠시 후 다시 시도해주세요</p>
          </section>
        )}

        {/* Empty */}
        {showEmptyState && (
          <section className="card-panel rounded-2xl text-center py-16 px-6">
            <p className="text-3xl mb-3">📡</p>
            <p className="text-sm font-medium text-gray-600">아직 수집된 가격 데이터가 없습니다</p>
            <p className="text-xs text-gray-400 mt-1.5">데이터 수집 스크립트를 실행해주세요</p>
          </section>
        )}

        {/* Calendar */}
        {!loading && !error && tripCosts.length > 0 && (
          <section className="card-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-400">1인당 예상 비용 · 실제 예약가와 다를 수 있음</span>
            </div>
            <PriceCalendar
              costs={tripCosts}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
            <HeatmapLegend />
          </section>
        )}
      </div>

      {/* Breakdown */}
      {selectedTrip && selectedCity && (
        <PriceBreakdown
          trip={selectedTrip}
          label={selectedLabel}
          city={selectedCity}
          onClose={handleCloseBreakdown}
        />
      )}
    </main>
  );
}
