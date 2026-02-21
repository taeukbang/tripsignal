import type {
  FlightPriceEntry,
  HotelPriceEntry,
  TripCost,
  PriceLabel,
  PriceStats,
} from "@/types";
import { ADULTS_COUNT } from "@/types";
import { addDays } from "./utils";

const PERCENTILE_LOWEST = 0.10;
const PERCENTILE_CHEAP = 0.25;
const PERCENTILE_EXPENSIVE = 0.75;
const PERCENTILE_PEAK = 0.90;

export function calculateTripCosts(
  flights: Record<string, Record<string, FlightPriceEntry>>,
  hotels: Record<string, Record<string, HotelPriceEntry>>,
  duration: number,
): TripCost[] {
  const costs: TripCost[] = [];
  const durationKey = String(duration);
  const nights = duration - 1;

  for (const [date, durations] of Object.entries(flights)) {
    const flight = durations[durationKey];
    if (!flight) continue;

    const hotelEntry = findNearestHotelPrice(hotels, date, durationKey);
    const hotelPricePerNight = hotelEntry?.price ?? 0;

    const flightForTwo = flight.price * ADULTS_COUNT;
    const hotelTotal = hotelPricePerNight * nights;
    const totalCostForTwo = flightForTwo + hotelTotal;
    const perPersonCost = Math.round(totalCostForTwo / ADULTS_COUNT);

    costs.push({
      departureDate: date,
      returnDate: addDays(date, duration - 1),
      flightPricePerPerson: flight.price,
      hotelPricePerNight,
      duration,
      totalCostForTwo,
      perPersonCost,
      hasDirectFlight: true,
      airlineCode: flight.airlineCode,
      airlineName: flight.airlineName,
      hotelName: hotelEntry?.hotelName ?? null,
    });
  }

  return costs.sort(
    (a, b) => a.departureDate.localeCompare(b.departureDate),
  );
}

function findNearestHotelPrice(
  hotels: Record<string, Record<string, HotelPriceEntry>>,
  targetDate: string,
  durationKey: string,
): HotelPriceEntry | null {
  if (hotels[targetDate]?.[durationKey]) {
    return hotels[targetDate][durationKey];
  }

  let nearest: HotelPriceEntry | null = null;
  let minDiff = Infinity;

  for (const [date, durations] of Object.entries(hotels)) {
    if (!durations[durationKey]) continue;
    const diff = Math.abs(Date.parse(date) - Date.parse(targetDate));
    if (diff < minDiff) {
      minDiff = diff;
      nearest = durations[durationKey];
    }
  }

  return nearest;
}

export function createPriceLabeler(allPrices: number[]): (price: number) => PriceLabel {
  if (allPrices.length === 0) return () => "normal";
  const sorted = [...allPrices].sort((a, b) => a - b);
  const len = sorted.length;

  return (price: number) => {
    let idx = sorted.findIndex((p) => p >= price);
    if (idx === -1) idx = len;
    const percentile = idx / len;
    if (percentile <= PERCENTILE_LOWEST) return "lowest";
    if (percentile <= PERCENTILE_CHEAP) return "cheap";
    if (percentile >= PERCENTILE_PEAK) return "peak";
    if (percentile >= PERCENTILE_EXPENSIVE) return "expensive";
    return "normal";
  };
}

export function getPriceLabelText(label: PriceLabel): string {
  switch (label) {
    case "lowest":
      return "최저가 근처";
    case "cheap":
      return "저렴한 편";
    case "expensive":
      return "비싼 편";
    case "peak":
      return "피크 시즌";
    default:
      return "";
  }
}

export function getPriceStats(costs: TripCost[]): PriceStats {
  if (costs.length === 0) {
    return { minCost: 0, maxCost: 0, avgCost: 0, minDate: "", count: 0 };
  }

  let minCost = Infinity;
  let maxCost = -Infinity;
  let sum = 0;
  let minDate = "";

  for (const c of costs) {
    const p = c.perPersonCost;
    sum += p;
    if (p < minCost) {
      minCost = p;
      minDate = c.departureDate;
    }
    if (p > maxCost) maxCost = p;
  }

  return {
    minCost,
    maxCost,
    avgCost: Math.round(sum / costs.length),
    minDate,
    count: costs.length,
  };
}
