import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-41N9YJBT04";
const SITE_URL = "https://tripsignal.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  title: "MyTripSignal — 출발일별 총 여행 비용을 한눈에",
  description:
    "향후 3~6개월간 출발일별 총 여행 비용(왕복 항공 + 숙소)을 캘린더 히트맵으로 보여주고, 최적 출발일을 탐색할 수 있는 서비스",
  keywords: [
    "여행 최저가",
    "출발일별 여행 비용",
    "항공권 최저가",
    "숙소 최저가",
    "여행 캘린더",
    "My TripSignal",
  ],
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.svg",
  },
  manifest: "/manifest.json",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "MyTripSignal — 출발일별 총 여행 비용을 한눈에",
    description:
      "3~6개월 캘린더 히트맵으로 최적의 여행 출발일을 찾아보세요. 항공 + 숙소 합산 1인당 비용을 한눈에.",
    type: "website",
    url: SITE_URL,
    siteName: "My TripSignal",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary",
    title: "My TripSignal — 출발일별 총 여행 비용을 한눈에",
    description: "캘린더 히트맵으로 최적의 여행 출발일을 찾아보세요.",
  },
  appleWebApp: {
    capable: true,
    title: "TripSignal",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
