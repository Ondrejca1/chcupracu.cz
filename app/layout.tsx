import type { Metadata } from "next";
import { NavigationFeedback } from "@/components/NavigationFeedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "chcupracu.cz | Práce na Vsetíně a okolí",
  description: "Lokální pracovní nabídky pro Vsetín, Rožnov, Velké Karlovice a okolí."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <NavigationFeedback />
        {children}
      </body>
    </html>
  );
}
