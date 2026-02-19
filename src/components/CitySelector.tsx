"use client";

import type { City } from "@/types";

interface CitySelectorProps {
  cities: City[];
  selected: City | null;
  onSelect: (city: City) => void;
}

export function CitySelector({ cities, selected, onSelect }: CitySelectorProps) {
  return (
    <div className="flex gap-2">
      {cities.map((city) => {
        const isActive = selected?.id === city.id;
        return (
          <button
            key={city.id}
            onClick={() => onSelect(city)}
            className={`
              px-5 py-2.5 rounded-full text-sm font-semibold
              transition-all duration-150
              ${isActive
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200"
              }
            `}
          >
            {city.nameKo}
          </button>
        );
      })}
    </div>
  );
}
