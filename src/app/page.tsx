"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CitySelector } from "@/components/CitySelector";
import { DurationSlider } from "@/components/DurationSlider";
import { PriceTrendChart } from "@/components/PriceTrendChart";
import { PriceCalendar } from "@/components/PriceCalendar";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { HeatmapLegend } from "@/components/ui/HeatmapLegend";
import { ShareButton } from "@/components/ShareButton";
import { Onboarding } from "@/components/Onboarding";
import { PriceAlertBanner } from "@/components/PriceAlert";
import {
  calculateTripCosts,
  getPriceStats,
  createPriceLabeler,
} from "@/lib/price-calculator";
import { formatPrice, formatPriceWon, formatShortDate } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import type { City, Continent, PriceData, Duration } from "@/types";
import { DEFAULT_DURATION, DURATIONS } from "@/types";
import { Logo } from "@/components/ui/Logo";
import { CONTINENTS } from "@/data/cities";

function readUrlParams(): { city?: string; duration?: Duration; date?: string } {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const city = params.get("city") ?? undefined;
  const date = params.get("date") ?? undefined;
  const durRaw = Number(params.get("duration"));
  const duration = DURATIONS.includes(durRaw as Duration)
    ? (durRaw as Duration)
    : undefined;
  return { city, duration, date };
}

function updateUrlParams(city: string, duration: Duration, date?: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("city", city);
  url.searchParams.set("duration", String(duration));
  if (date) {
    url.searchParams.set("date", date);
  } else {
    url.searchParams.delete("date");
  }
  window.history.replaceState(null, "", url.toString());
}

export default function HomePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [duration, setDuration] = useState<Duration>(DEFAULT_DURATION);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPricingInfo, setShowPricingInfo] = useState(false);

  const urlParamsRef = useRef(readUrlParams());

  useEffect(() => {
    fetch("/api/cities")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const list: City[] = json.data;
        setCities(list);

        const urlCity = urlParamsRef.current.city;
        const match = urlCity ? list.find((c) => c.id === urlCity) : null;
        setSelectedCity(match ?? list[0] ?? null);

        if (urlParamsRef.current.duration) {
          setDuration(urlParamsRef.current.duration);
        }
        if (urlParamsRef.current.date) {
          setSelectedDate(urlParamsRef.current.date);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("도시 목록을 불러오지 못했습니다");
      });
  }, []);

  useEffect(() => {
    if (!selectedCity) return;
    setLoading(true);
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

  useEffect(() => {
    if (selectedCity) {
      updateUrlParams(selectedCity.id, duration, selectedDate);
    }
  }, [selectedCity, duration, selectedDate]);

  const tripCosts = useMemo(() => {
    if (!priceData) return [];
    return calculateTripCosts(priceData.flights, priceData.hotels, duration);
  }, [priceData, duration]);

  const stats = useMemo(() => getPriceStats(tripCosts), [tripCosts]);

  const priceLabeler = useMemo(
    () => createPriceLabeler(tripCosts.map((c) => c.perPersonCost)),
    [tripCosts],
  );

  const alertPrices = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedCity) return map;
    for (const cost of tripCosts) {
      map.set(`${selectedCity.id}_${cost.departureDate}`, cost.perPersonCost);
    }
    return map;
  }, [tripCosts, selectedCity]);

  const selectedTrip = selectedDate
    ? tripCosts.find((c) => c.departureDate === selectedDate) ?? null
    : null;

  const selectedLabel = selectedTrip
    ? priceLabeler(selectedTrip.perPersonCost)
    : "normal";

  const handleSelectCity = useCallback(
    (city: City) => {
      setSelectedCity(city);
      setSelectedDate(null);
      analytics.cityChange(city.id, city.nameKo);
    },
    [],
  );

  const handleDurationChange = useCallback((d: Duration) => {
    setDuration(d);
    analytics.durationChange(d);
  }, []);

  const handleSelectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      const cost = tripCosts.find((c) => c.departureDate === date);
      if (cost && selectedCity) {
        analytics.dateSelect(date, cost.perPersonCost, selectedCity.id);
      }
    },
    [tripCosts, selectedCity],
  );

  const handleCloseBreakdown = useCallback(() => setSelectedDate(null), []);

  const handlePricingInfoToggle = useCallback(() => {
    setShowPricingInfo((v) => {
      analytics.pricingInfoToggle(!v);
      return !v;
    });
  }, []);

  const showEmptyState =
    priceData === null && !loading && !error && cities.length > 0;
  const isSparseData =
    !loading && !error && tripCosts.length > 0 && tripCosts.length < 60;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-5">
          <div className="flex items-center justify-center gap-2">
            <Logo size={30} />
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              My<span className="text-blue-600">TripSignal</span>
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            내 여행의 시세를 확인하세요
          </p>
          <p className="text-[10px] text-gray-300 mt-1">
            직항 왕복 + 도심 숙소 합산 · 1인 기준
          </p>
          {selectedCity && (
            <div className="mt-2 flex justify-center">
              <ShareButton
                city={selectedCity}
                duration={duration}
                selectedDate={selectedDate}
              />
            </div>
          )}
        </header>

        {/* Price Alert Banner */}
        <PriceAlertBanner currentPrices={alertPrices} />

        {/* Pricing info toggle */}
        <section className="mb-5">
          <button
            onClick={handlePricingInfoToggle}
            className="w-full text-left text-[11px] text-gray-400 hover:text-gray-500 transition flex items-center gap-1"
          >
            <span>가격 산정 기준</span>
            <span
              className={`transition-transform ${showPricingInfo ? "rotate-90" : ""}`}
            >
              ›
            </span>
          </button>
          {showPricingInfo && (
            <div className="card-panel rounded-xl p-3 mt-2 text-[11px] text-gray-500 leading-relaxed space-y-1 animate-fade-in">
              <p>• 마이리얼트립 직항 기준 왕복 항공 최저가 (2인)</p>
              <p>• 도심 3성급 숙소 1실 기준, 여정 박수에 따라 계산</p>
              <p>• 위 합산 금액을 1인당 비용으로 산출</p>
              <p className="text-gray-400 pt-1">
                ※ 예상 비용이며, 실시간 변동으로 마이리얼트립 이동 시 다른
                가격이 표시될 수 있습니다
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
            onSelect={handleSelectCity}
          />
        </section>

        {/* Duration Slider */}
        <section className="card-panel rounded-2xl p-4 mb-3">
          <DurationSlider value={duration} onChange={handleDurationChange} />
        </section>

        {/* Summary */}
        {stats.count > 0 && (
          <section className="card-panel rounded-2xl p-4 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">
                  1인당 최저가
                </div>
                <div className="text-2xl font-extrabold text-blue-600">
                  {formatPrice(stats.minCost)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {stats.minDate && `${formatShortDate(stats.minDate)} 출발`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">
                  평균
                </div>
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
            <div className="text-[10px] text-gray-400 mb-2">
              출발일별 1인당 예상 비용 추이
            </div>
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
            <p className="text-xs text-gray-400 mt-4">
              가격 데이터를 불러오고 있어요
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

        {/* Empty — no data at all */}
        {showEmptyState && (
          <section className="card-panel rounded-2xl text-center py-16 px-6">
            <p className="text-3xl mb-3">📡</p>
            <p className="text-sm font-medium text-gray-600">
              아직 수집된 가격 데이터가 없습니다
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              데이터 수집 스크립트를 실행해주세요
            </p>
          </section>
        )}

        {/* Empty — data loaded but no trip costs for this duration */}
        {!loading && !error && priceData && tripCosts.length === 0 && (
          <section className="card-panel rounded-2xl text-center py-12 px-6">
            <p className="text-sm font-medium text-gray-600">
              이 도시의 {duration}일 여정 직항 데이터가 아직 없습니다
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              다른 여정 길이를 시도하거나 다른 도시를 선택해보세요
            </p>
          </section>
        )}

        {/* Calendar */}
        {!loading && !error && tripCosts.length > 0 && (
          <section className="card-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-400">
                1인당 예상 비용 · 실제 예약가와 다를 수 있음
              </span>
            </div>
            {isSparseData && (
              <div className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3 flex items-start gap-1.5">
                <span className="shrink-0 mt-px">⚠</span>
                <span>
                  직항 데이터가 일부 날짜만 제공됩니다. 빈 날짜는 직항이 없거나 아직 수집되지 않은 날짜입니다.
                </span>
              </div>
            )}
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

      {/* Onboarding (first visit only) */}
      <Onboarding />
    </main>
  );
}
