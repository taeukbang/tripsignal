import type { City } from "@/types";

export const CITIES: City[] = [
  {
    id: "paris",
    nameKo: "파리",
    nameEn: "Paris",
    airportCode: "CDG",
    airportNameKo: "샤를드 골",
    regionId: 6139506,
    downtownPoiId: "118971",
  },
  {
    id: "tokyo",
    nameKo: "도쿄",
    nameEn: "Tokyo",
    airportCode: "NRT",
    airportNameKo: "나리타",
    regionId: 6139291,
    downtownPoiId: "14048",
  },
  {
    id: "bangkok",
    nameKo: "방콕",
    nameEn: "Bangkok",
    airportCode: "BKK",
    airportNameKo: "수완나품",
    regionId: 524,
    downtownPoiId: "118873",
  },
];

export function getCityById(cityId: string): City | undefined {
  return CITIES.find((c) => c.id === cityId);
}
