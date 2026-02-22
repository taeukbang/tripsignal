import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase";
import { CITIES } from "@/data/cities";
import { ADULTS_COUNT } from "@/types";
import type { CityCostSummary } from "@/types";

export async function GET(request: NextRequest) {
  const durParam = request.nextUrl.searchParams.get("duration");
  const duration = durParam ? Number(durParam) : 5;

  if (duration < 3 || duration > 7) {
    return NextResponse.json(
      { data: null, error: "duration must be 3-7", meta: {} },
      { status: 400 },
    );
  }

  try {
    const supabase = createAnonClient();
    const nights = duration - 1;

    const [flightResult, hotelResult] = await Promise.all([
      supabase
        .from("flight_prices")
        .select("city_id, departure_date, duration, price, airline_code")
        .eq("duration", duration)
        .order("departure_date", { ascending: true }),
      supabase
        .from("hotel_prices")
        .select("city_id, check_in_date, duration, min_price_per_night")
        .eq("duration", duration)
        .order("check_in_date", { ascending: true }),
    ]);

    if (flightResult.error) throw flightResult.error;
    if (hotelResult.error) throw hotelResult.error;

    const hotelByCity = new Map<string, Map<string, number>>();
    for (const row of hotelResult.data ?? []) {
      if (!hotelByCity.has(row.city_id)) {
        hotelByCity.set(row.city_id, new Map());
      }
      hotelByCity.get(row.city_id)!.set(row.check_in_date, row.min_price_per_night);
    }

    const cityMap = new Map<string, { costs: number[]; dates: string[] }>();

    for (const row of flightResult.data ?? []) {
      const cityHotels = hotelByCity.get(row.city_id);
      let hotelPrice = 0;

      if (cityHotels) {
        hotelPrice = cityHotels.get(row.departure_date) ?? findNearestHotel(cityHotels, row.departure_date);
      }

      const flightForTwo = row.price * ADULTS_COUNT;
      const hotelTotal = hotelPrice * nights;
      const perPerson = Math.round((flightForTwo + hotelTotal) / ADULTS_COUNT);

      if (!cityMap.has(row.city_id)) {
        cityMap.set(row.city_id, { costs: [], dates: [] });
      }
      const entry = cityMap.get(row.city_id)!;
      entry.costs.push(perPerson);
      entry.dates.push(row.departure_date);
    }

    const summaries: CityCostSummary[] = [];

    for (const city of CITIES) {
      const entry = cityMap.get(city.id);
      if (!entry || entry.costs.length === 0) continue;

      let minCost = Infinity;
      let minIdx = 0;
      let sum = 0;

      for (let i = 0; i < entry.costs.length; i++) {
        sum += entry.costs[i];
        if (entry.costs[i] < minCost) {
          minCost = entry.costs[i];
          minIdx = i;
        }
      }

      summaries.push({
        cityId: city.id,
        nameKo: city.nameKo,
        countryKo: city.countryKo,
        continentId: city.continentId,
        minPerPersonCost: minCost,
        avgPerPersonCost: Math.round(sum / entry.costs.length),
        cheapestDate: entry.dates[minIdx],
        dataPoints: entry.costs.length,
      });
    }

    summaries.sort((a, b) => a.minPerPersonCost - b.minPerPersonCost);

    return NextResponse.json(
      {
        data: summaries,
        error: null,
        meta: { duration, cityCount: summaries.length },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    console.error("[compare API] Error:", err);
    return NextResponse.json(
      {
        data: null,
        error: err instanceof Error ? err.message : "Internal server error",
        meta: {},
      },
      { status: 500 },
    );
  }
}

function findNearestHotel(hotels: Map<string, number>, targetDate: string): number {
  let nearest = 0;
  let minDiff = Infinity;

  for (const [date, price] of hotels) {
    const diff = Math.abs(Date.parse(date) - Date.parse(targetDate));
    if (diff < minDiff) {
      minDiff = diff;
      nearest = price;
    }
  }

  return nearest;
}
