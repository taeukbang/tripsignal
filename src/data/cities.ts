import type { City, Continent } from "@/types";

export const CONTINENTS: Continent[] = [
  { id: "asia", nameKo: "아시아" },
  { id: "europe", nameKo: "유럽" },
];

export const CITIES: City[] = [
  {
    id: "paris",
    nameKo: "파리",
    nameEn: "Paris",
    airportCode: "CDG",
    airportNameKo: "샤를드 골",
    regionId: 6139506,
    downtownPoiId: "118971",
    continentId: "europe",
  },
  {
    id: "tokyo",
    nameKo: "도쿄",
    nameEn: "Tokyo",
    airportCode: "NRT",
    airportNameKo: "나리타",
    regionId: 6139291,
    downtownPoiId: "14048",
    continentId: "asia",
  },
  {
    id: "bangkok",
    nameKo: "방콕",
    nameEn: "Bangkok",
    airportCode: "BKK",
    airportNameKo: "수완나품",
    regionId: 524,
    downtownPoiId: "118873",
    continentId: "asia",
  },
];

export function getCityById(cityId: string): City | undefined {
  return CITIES.find((c) => c.id === cityId);
}

export function getCitiesByContinent(continentId: string): City[] {
  if (continentId === "all") return CITIES;
  return CITIES.filter((c) => c.continentId === continentId);
}
