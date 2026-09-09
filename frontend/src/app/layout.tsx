import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Area-Specific Shelter Thermal Design & Simulation Platform",
  description: "High-altitude and regional shelter thermal comfort analysis (SIH 2026)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
