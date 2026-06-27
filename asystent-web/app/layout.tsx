import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asystent — Drugi Mózg",
  description: "Twój osobisty asystent do Notion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
