import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase";
import { getCityById } from "@/data/cities";
import { getAirlineName } from "@/lib/utils";
import type { FlightPriceEntry, HotelPriceEntry } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const { cityId } = await params;
  const city = getCityById(cityId);

  if (!city) {
    return NextResponse.json(
      { data: null, error: "City not found", meta: {} },
      { status: 404 },
    );
  }

  try {
    const supabase = createAnonClient();

    const [flightResult, hotelResult] = await Promise.all([
      supabase
        .from("flight_prices")
        .select("departure_date, duration, price, airline_code, airline_name")
        .eq("city_id", cityId)
        .order("departure_date", { ascending: true }),
      supabase
        .from("hotel_prices")
        .select("check_in_date, duration, min_price_per_night, hotel_name")
        .eq("city_id", cityId)
        .order("check_in_date", { ascending: true }),
    ]);

    if (flightResult.error) throw flightResult.error;
    if (hotelResult.error) throw hotelResult.error;

    const flights: Record<string, Record<string, FlightPriceEntry>> = {};
    for (const row of flightResult.data ?? []) {
      if (!flights[row.departure_date]) {
        flights[row.departure_date] = {};
      }
      const code = row.airline_code ?? "";
      flights[row.departure_date][String(row.duration)] = {
        price: row.price,
        airlineCode: code,
        airlineName: row.airline_name || getAirlineName(code),
      };
    }

    const hotels: Record<string, Record<string, HotelPriceEntry>> = {};
    for (const row of hotelResult.data ?? []) {
      if (!hotels[row.check_in_date]) {
        hotels[row.check_in_date] = {};
      }
      hotels[row.check_in_date][String(row.duration)] = {
        price: row.min_price_per_night,
        hotelName: row.hotel_name,
      };
    }

    const dates = Object.keys(flights);

    return NextResponse.json(
      {
        data: { flights, hotels },
        error: null,
        meta: {
          cityId,
          dateRange: dates.length > 0
            ? { from: dates[0], to: dates[dates.length - 1] }
            : null,
          flightCount: dates.length,
          hotelDateCount: Object.keys(hotels).length,
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    console.error("[prices API] Error:", err);
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
