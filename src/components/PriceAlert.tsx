"use client";

import { useState, useEffect, useCallback } from "react";
import type { City, TripCost } from "@/types";
import { formatPriceWon } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

const STORAGE_KEY = "tsj_price_alerts";

export interface PriceAlertData {
  cityId: string;
  cityName: string;
  departureDate: string;
  duration: number;
  priceAtSave: number;
  createdAt: string;
}

function getAlerts(): PriceAlertData[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlertData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

/* ─── Button: shown inside PriceBreakdown ─── */

interface PriceAlertButtonProps {
  city: City;
  trip: TripCost;
}

export function PriceAlertButton({ city, trip }: PriceAlertButtonProps) {
  const [isSet, setIsSet] = useState(false);

  useEffect(() => {
    const exists = getAlerts().some(
      (a) => a.cityId === city.id && a.departureDate === trip.departureDate,
    );
    setIsSet(exists);
  }, [city.id, trip.departureDate]);

  const toggle = () => {
    const alerts = getAlerts();
    if (isSet) {
      saveAlerts(
        alerts.filter(
          (a) =>
            !(a.cityId === city.id && a.departureDate === trip.departureDate),
        ),
      );
      setIsSet(false);
      analytics.priceAlertRemove(city.id, trip.departureDate);
    } else {
      alerts.push({
        cityId: city.id,
        cityName: city.nameKo,
        departureDate: trip.departureDate,
        duration: trip.duration,
        priceAtSave: trip.perPersonCost,
        createdAt: new Date().toISOString(),
      });
      saveAlerts(alerts);
      setIsSet(true);
      analytics.priceAlertSet(city.id, trip.departureDate, trip.perPersonCost);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ring-1 transition ${
        isSet
          ? "text-blue-600 bg-blue-50 ring-blue-200"
          : "text-gray-500 bg-white ring-gray-200 hover:ring-blue-200 hover:text-blue-600"
      }`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill={isSet ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {isSet ? "알림 해제" : "가격 알림"}
    </button>
  );
}

/* ─── Banner: shown at top when a tracked price dropped ─── */

interface PriceAlertBannerProps {
  currentPrices: Map<string, number>;
}

export function PriceAlertBanner({ currentPrices }: PriceAlertBannerProps) {
  const [alerts, setAlerts] = useState<
    (PriceAlertData & { currentPrice: number; diff: number })[]
  >([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = getAlerts();
    const dropped = saved
      .map((a) => {
        const key = `${a.cityId}_${a.departureDate}`;
        const current = currentPrices.get(key);
        if (!current) return null;
        const diff = a.priceAtSave - current;
        if (diff <= 0) return null;
        return { ...a, currentPrice: current, diff };
      })
      .filter(
        (a): a is PriceAlertData & { currentPrice: number; diff: number } =>
          a !== null,
      );
    setAlerts(dropped);
  }, [currentPrices]);

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => new Set(prev).add(key));
  }, []);

  const visible = alerts.filter(
    (a) => !dismissed.has(`${a.cityId}_${a.departureDate}`),
  );
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map((a) => {
        const key = `${a.cityId}_${a.departureDate}`;
        return (
          <div
            key={key}
            className="card-panel rounded-xl p-3 flex items-center justify-between border-l-4 border-blue-500 animate-slide-up"
          >
            <div>
              <div className="text-xs font-semibold text-blue-600">
                📉 가격이 {formatPriceWon(a.diff)} 내렸어요!
              </div>
              <div className="text-[11px] text-gray-500">
                {a.cityName} · {a.departureDate} 출발 · 현재{" "}
                {formatPriceWon(a.currentPrice)}
              </div>
            </div>
            <button
              onClick={() => dismiss(key)}
              className="text-gray-400 hover:text-gray-500 p-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
