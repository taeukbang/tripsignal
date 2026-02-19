"use client";

import type { PriceLabel as PriceLabelType } from "@/types";
import { getPriceLabelText } from "@/lib/price-calculator";

interface PriceLabelProps {
  label: PriceLabelType;
}

const LABEL_STYLES: Record<string, { bg: string; text: string }> = {
  lowest: { bg: "#DBEAFE", text: "#1E40AF" },
  cheap: { bg: "#DCFCE7", text: "#166534" },
  expensive: { bg: "#FFEDD5", text: "#9A3412" },
  peak: { bg: "#FEE2E2", text: "#991B1B" },
};

export function PriceLabelBadge({ label }: PriceLabelProps) {
  const text = getPriceLabelText(label);
  if (!text) return null;

  const style = LABEL_STYLES[label] ?? { bg: "#F3F4F6", text: "#374151" };

  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {text}
    </span>
  );
}
