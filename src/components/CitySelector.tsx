"use client";

import { useState, useMemo } from "react";
import type { City, Continent } from "@/types";

interface CitySelectorProps {
  continents: Continent[];
  cities: City[];
  selected: City | null;
  onSelect: (city: City) => void;
}

export function CitySelector({ continents, cities, selected, onSelect }: CitySelectorProps) {
  const [continentId, setContinentId] = useState("all");

  const filteredCities = useMemo(() => {
    if (continentId === "all") return cities;
    return cities.filter((c) => c.continentId === continentId);
  }, [cities, continentId]);

  const handleContinentChange = (newId: string) => {
    setContinentId(newId);
    const filtered = newId === "all" ? cities : cities.filter((c) => c.continentId === newId);
    if (filtered.length > 0) {
      const stillInList = filtered.find((c) => c.id === selected?.id);
      if (!stillInList) {
        onSelect(filtered[0]);
      }
    }
  };

  const handleCityChange = (cityId: string) => {
    const city = filteredCities.find((c) => c.id === cityId);
    if (city) onSelect(city);
  };

  return (
    <div className="flex gap-2 w-full">
      <select
        value={continentId}
        onChange={(e) => handleContinentChange(e.target.value)}
        className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="all">전체 대륙</option>
        {continents.map((c) => (
          <option key={c.id} value={c.id}>{c.nameKo}</option>
        ))}
      </select>

      <select
        value={selected?.id ?? ""}
        onChange={(e) => handleCityChange(e.target.value)}
        className="flex-[2] px-3 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        {filteredCities.map((c) => (
          <option key={c.id} value={c.id}>{c.nameKo}</option>
        ))}
      </select>
    </div>
  );
}
