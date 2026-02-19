"use client";

import type { City, TripCost, PriceLabel as PriceLabelType } from "@/types";
import { ADULTS_COUNT } from "@/types";
import { formatPriceWon, getDayOfWeek } from "@/lib/utils";
import { buildFlightUrl, buildHotelUrl } from "@/lib/deeplinks";
import { PriceLabelBadge } from "@/components/ui/PriceLabel";

interface PriceBreakdownProps {
  trip: TripCost;
  label: PriceLabelType;
  city: City;
  onClose: () => void;
}

export function PriceBreakdown({ trip, label, city, onClose }: PriceBreakdownProps) {
  const d = new Date(trip.departureDate);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = getDayOfWeek(trip.departureDate);
  const nights = trip.duration - 1;

  const flightForTwo = trip.flightPricePerPerson * ADULTS_COUNT;
  const hotelTotal = trip.hotelPricePerNight * nights;

  const flightUrl = buildFlightUrl(city, trip.departureDate, trip.returnDate);
  const hotelUrl = buildHotelUrl(city, trip.departureDate, trip.returnDate);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-gray-900">
            {month}월 {day}일 ({dow}) 출발
          </h3>
          <PriceLabelBadge label={label} />
        </div>
        <div className="text-xs text-gray-400 mb-4">
          {nights}박 {trip.duration}일 · 성인 {ADULTS_COUNT}인 · 이코노미 · 1실 · 예상가
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start justify-between p-3.5 bg-blue-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-lg">✈</div>
              <div>
                <div className="text-sm font-semibold text-gray-900">왕복 항공 ({ADULTS_COUNT}인)</div>
                <div className="text-[11px] text-gray-500">
                  {trip.airlineName
                    ? `${trip.airlineName} (${trip.airlineCode}) · 직항`
                    : "직항 최저가"}
                </div>
                <div className="text-[11px] text-gray-400">1인 {formatPriceWon(trip.flightPricePerPerson)}</div>
              </div>
            </div>
            <span className="text-sm font-bold text-gray-900 pt-0.5">{formatPriceWon(flightForTwo)}</span>
          </div>

          <div className="flex items-start justify-between p-3.5 bg-gray-50/80 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg">🏨</div>
              <div>
                <div className="text-sm font-semibold text-gray-900">숙소 {nights}박 (1실)</div>
                <div className="text-[11px] text-gray-500 max-w-[180px] truncate">
                  {trip.hotelName ?? "4성급 최저가"}
                </div>
                <div className="text-[11px] text-gray-400">{formatPriceWon(trip.hotelPricePerNight)}/박 · 4성급</div>
              </div>
            </div>
            <span className="text-sm font-bold text-gray-900 pt-0.5">{formatPriceWon(hotelTotal)}</span>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{ADULTS_COUNT}인 합계</span>
              <span className="text-sm font-semibold text-gray-500">{formatPriceWon(trip.totalCostForTwo)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-blue-600">1인당</span>
              <span className="text-2xl font-extrabold text-blue-600">{formatPriceWon(trip.perPersonCost)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <a
            href={flightUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 text-center text-sm font-semibold text-blue-600 bg-white rounded-xl ring-1 ring-blue-200 hover:bg-blue-50 transition"
          >
            항공권 보기
          </a>
          <a
            href={hotelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 text-center text-sm font-semibold text-blue-600 bg-white rounded-xl ring-1 ring-blue-200 hover:bg-blue-50 transition"
          >
            숙소 보기
          </a>
        </div>
      </div>
    </div>
  );
}
