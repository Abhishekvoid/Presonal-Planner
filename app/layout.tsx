import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { SoundDeck } from "@/components/ambient/SoundDeck";
import { AmbientBackground } from "@/components/webgl/AmbientBackground";
import { InkCursor } from "@/components/cursor/InkCursor";
import { AlmanacFrame } from "@/components/AlmanacFrame";
import { themeBootstrapScript } from "@/lib/theme";

// Archivo is a variable font; we load the width axis and drive it to
// full expanded width in CSS (.font-display) for the "Archivo Expanded" look.
const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Planner — daily goals & learning",
  description: "A personal goal and learning planner. Discipline, made tactile.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets the theme class before paint to avoid a flash of the wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="font-sans antialiased">
        <AmbientBackground />
        {children}
        <AlmanacFrame />
        <InkCursor />
        <SoundDeck />
      </body>
    </html>
  );
}
