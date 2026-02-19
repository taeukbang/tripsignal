import { NextResponse } from "next/server";
import { CITIES } from "@/data/cities";

export async function GET() {
  return NextResponse.json(
    {
      data: CITIES,
      error: null,
      meta: { count: CITIES.length },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    },
  );
}
