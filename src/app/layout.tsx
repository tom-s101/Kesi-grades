import type { Metadata, Viewport } from "next";
import { Fraunces, Karla } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

const SITE_TITLE = "KESI — Katutubo Excel Schools";
const SITE_DESCRIPTION =
  "Grades, attendance and report cards for the six Katutubo Excel Schools campuses — Agbalite, Binuangan, Pinagbayanan, Sulong Ipil, Baraas and Kaupawan.";

// The card shown when a link is shared in Messenger, WhatsApp, Viber,
// iMessage and so on. Made from public/brand/kesi-logo.jpg; 1200×630.
const SHARE_IMAGE = {
  url: "/brand/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "KESI — grades, attendance and report cards in one place",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://kesigrades.org"),
  title: {
    default: SITE_TITLE,
    template: "%s — KESI",
  },
  description: SITE_DESCRIPTION,
  applicationName: "KESI",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "KESI Grades",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SHARE_IMAGE],
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SHARE_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#191a15" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${fraunces.variable} ${karla.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
