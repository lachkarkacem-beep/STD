import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Société Tunisienne de Décoration — Catalogue",
  description:
    "Bacs, pots, vasques, colonnes et dallages en pierre reconstituée pour maisons et jardins.",
  icons: { icon: "/brand/logo.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {/* Mesure d'audience Vercel : pages vues et visiteurs, sans cookie et
            sans identifiant qui suive quelqu'un d'un site à l'autre. Le script
            n'est servi qu'en production, pas pendant le développement. */}
        <Analytics />
      </body>
    </html>
  );
}
