import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { SoundDeck } from "@/components/ambient/SoundDeck";

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
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <SoundDeck />
      </body>
    </html>
  );
}
